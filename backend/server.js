const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-supabase-url')) {
  console.warn('WARNING: Supabase URL or Key is missing/invalid. Supabase connection will fail.');
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  console.error('ERROR: Gemini API Key is missing. Server requires GEMINI_API_KEY to start.');
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Initialize DeepSeek Config
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
const deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const geminiModel = process.env.GEMINI_MODEL || 'gemini-embedding-001';


if (!deepseekApiKey) {
  console.warn('WARNING: DeepSeek API Key is missing. AI Text analysis will fail.');
}

// Helper function to get text embedding from Gemini
async function getEmbedding(text) {
  try {
    const model = genAI.getGenerativeModel({ model: geminiModel });
    const result = await model.embedContent({
      content: { parts: [{ text: text }] },
      outputDimensionality: 768
    });
    if (result && result.embedding && result.embedding.values) {
      return result.embedding.values;
    }
    throw new Error('Failed to extract embedding values from Gemini response');
  } catch (error) {
    console.error('Error calling Gemini Embedding API:', error);
    throw error;
  }
}

// Routes

// 1. Get all links
app.get('/api/links', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fl_links')
      .select('id, url, title, content, deadline, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 2. Create new link with AI title embedding
app.post('/api/links', async (req, res) => {
  const { url, title, content, deadline } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Use URL as title if not provided
  const targetTitle = title || url;

  try {
    console.log(`Generating embedding for title: "${targetTitle}"`);
    const embedding = await getEmbedding(targetTitle);
    console.log(`Embedding generated successfully. Size: ${embedding.length}`);

    // Insert into Supabase
    const { data, error } = await supabase
      .from('fl_links')
      .insert([
        {
          url,
          title: targetTitle,
          content: content || null,
          deadline: deadline || null,
          embedding: embedding
        }
      ])
      .select('id, url, title, content, deadline, created_at');

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 2.5 Analyze raw text to extract and create a link with embedding using DeepSeek V4 Flash
app.post('/api/links/analyze', async (req, res) => {
  const { rawText } = req.body;

  if (!rawText) {
    return res.status(400).json({ error: 'Nội dung văn bản thô là bắt buộc' });
  }

  if (!deepseekApiKey) {
    return res.status(500).json({ error: 'DeepSeek API Key chưa được cấu hình trên server.' });
  }

  try {
    const cleanBaseUrl = deepseekBaseUrl.endsWith('/') ? deepseekBaseUrl.slice(0, -1) : deepseekBaseUrl;
    const endpoint = cleanBaseUrl.includes('/v1') ? `${cleanBaseUrl}/chat/completions` : `${cleanBaseUrl}/v1/chat/completions`;

    console.log(`Analyzing raw text with DeepSeek (${deepseekModel})...`);

    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const prompt = `Analyze the following text and extract information to populate a link entry.
The output MUST be a JSON object with these exact keys:
- url: string (the web link found in the text. Return null if none).
- title: string (a concise, descriptive title for this link in Vietnamese. Max 100 characters).
- content: string (a short summary of the context/purpose of this link in Vietnamese. Max 200 characters).
- deadline: string or null (the deadline date extracted from the text in YYYY-MM-DD format. Calculate relative dates using current date: ${currentDate}. If no deadline is specified, return null).

Text to analyze:
"${rawText}"`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: deepseekModel,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant. You must output a valid JSON object only, matching the user requested schema."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: {
          type: "json_object"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API returned HTTP ${response.status}: ${errorText}`);
    }

    const deepseekData = await response.json();
    const text = deepseekData.choices[0].message.content;
    console.log("DeepSeek analysis output:", text);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      throw new Error("Không thể phân tích kết quả trả về từ DeepSeek thành JSON hợp lệ.");
    }

    if (!parsed.url) {
      return res.status(400).json({ error: 'Không tìm thấy liên kết URL nào trong nội dung này.' });
    }

    const titleToEmbed = parsed.title || parsed.url;
    console.log(`Generating embedding for extracted title: "${titleToEmbed}"`);
    const embedding = await getEmbedding(titleToEmbed);
    console.log(`Embedding generated successfully. Size: ${embedding.length}`);

    // Insert into Supabase
    const { data, error } = await supabase
      .from('fl_links')
      .insert([
        {
          url: parsed.url,
          title: titleToEmbed,
          content: parsed.content || null,
          deadline: parsed.deadline || null,
          embedding: embedding
        }
      ])
      .select('id, url, title, content, deadline, created_at');

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error analyzing and creating link:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 3. Search links semantically using vector similarity
app.post('/api/search', async (req, res) => {
  const { query, threshold, limit } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const matchThreshold = threshold !== undefined ? parseFloat(threshold) : 0.3;
  const matchLimit = limit !== undefined ? parseInt(limit, 10) : 10;

  try {
    console.log(`Generating embedding for search query: "${query}"`);
    const queryEmbedding = await getEmbedding(query);
    console.log(`Query embedding generated. Size: ${queryEmbedding.length}. Calling match_links...`);

    // Call Supabase match_links function
    const { data, error } = await supabase.rpc('match_links', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchLimit
    });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error searching links:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 4. Delete a link
app.delete('/api/links/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('fl_links')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
