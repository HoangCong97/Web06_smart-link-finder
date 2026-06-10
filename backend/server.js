const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET || 'super_secret_key_for_smart_link_finder_12345';


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

// Middleware xác thực JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>

    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Chưa cung cấp token xác thực' });
  }
};

// Middleware phân quyền
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này' });
    }
    next();
  };
};

// Hàm khởi tạo tài khoản Admin mặc định
async function seedAdminUser() {
  try {
    const { data: users, error } = await supabase
      .from('fl_users')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('fl_users')) {
        console.warn('WARNING: Bảng "fl_users" chưa tồn tại trong database. Vui lòng chạy nội dung file backend/init.db.sql trong SQL Editor của Supabase.');
      } else {
        console.error('Lỗi khi kiểm tra bảng fl_users:', error.message);
      }
      return;
    }

    if (users && users.length === 0) {
      console.log('Không tìm thấy tài khoản admin. Tiến hành khởi tạo tài khoản admin mặc định...');
      const hashedPassword = await bcrypt.hash('Congqt@97', 10);
      const { error: insertError } = await supabase
        .from('fl_users')
        .insert([
          {
            username: 'admin',
            password: hashedPassword,
            role: 'admin'
          }
        ]);

      if (insertError) {
        console.error('Không thể tạo tài khoản admin mặc định:', insertError.message);
      } else {
        console.log('Tài khoản admin mặc định đã được tạo thành công: admin / Congqt@97');
      }
    } else {
      console.log('Tài khoản admin đã tồn tại trong hệ thống.');
    }
  } catch (err) {
    console.error('Lỗi khi seed tài khoản admin:', err);
  }
}

// Chạy seed admin khi khởi động
seedAdminUser();

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

// Auth Route: Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng cung cấp username và password' });
  }

  try {
    const { data: user, error } = await supabase
      .from('fl_users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Lỗi đăng nhập:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

// GET /api/users (Admin only: lấy danh sách manager)
app.get('/api/users', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fl_users')
      .select('id, username, role, created_at')
      .eq('role', 'manager')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Lỗi lấy danh sách manager:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/users (Admin only: tạo manager)
app.post('/api/users', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng điền tên đăng nhập và mật khẩu' });
  }

  try {
    // Check if user already exists
    const { data: existing, error: checkError } = await supabase
      .from('fl_users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existing) {
      return res.status(400).json({ error: 'Tên đăng nhập đã được sử dụng' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('fl_users')
      .insert([
        {
          username,
          password: hashedPassword,
          role: 'manager'
        }
      ])
      .select('id, username, role, created_at');

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Lỗi tạo manager:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/users/:id (Admin only: sửa manager)
app.put('/api/users/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;

  try {
    // Check if user exists
    const { data: existing, error: checkError } = await supabase
      .from('fl_users')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng này' });
    }

    if (existing.role === 'admin' && req.user.username !== existing.username) {
      return res.status(403).json({ error: 'Bạn không thể sửa thông tin của admin khác' });
    }

    const updateData = {};
    if (username !== undefined) {
      // Check if username is taken by another user
      if (username !== existing.username) {
        const { data: duplicate } = await supabase
          .from('fl_users')
          .select('id')
          .eq('username', username)
          .maybeSingle();
        if (duplicate) {
          return res.status(400).json({ error: 'Tên đăng nhập đã được sử dụng' });
        }
        updateData.username = username;
      }
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Không có thông tin nào để cập nhật' });
    }

    const { data, error } = await supabase
      .from('fl_users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, role, created_at');

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error('Lỗi cập nhật manager:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// DELETE /api/users/:id (Admin only: xóa manager)
app.delete('/api/users/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;

  try {
    // Check if user exists and is not admin
    const { data: existing, error: checkError } = await supabase
      .from('fl_users')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng này' });
    }

    if (existing.role === 'admin') {
      return res.status(400).json({ error: 'Không thể xóa tài khoản Admin' });
    }

    const { error } = await supabase
      .from('fl_users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Đã xóa manager thành công' });
  } catch (err) {
    console.error('Lỗi xóa manager:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

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
app.post('/api/links', authenticateJWT, async (req, res) => {
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
app.post('/api/links/analyze', authenticateJWT, async (req, res) => {
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
app.delete('/api/links/:id', authenticateJWT, async (req, res) => {
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

// 4.5. Update a link (Edit post/link)
app.put('/api/links/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { url, title, content, deadline } = req.body;

  try {
    // Check if link exists
    const { data: existing, error: fetchError } = await supabase
      .from('fl_links')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Liên kết không tồn tại' });
    }

    const updateData = {};
    if (url !== undefined) updateData.url = url;
    if (content !== undefined) updateData.content = content;
    if (deadline !== undefined) updateData.deadline = deadline || null;

    if (title !== undefined && title !== existing.title) {
      updateData.title = title;
      console.log(`Title changed. Generating new embedding for: "${title}"`);
      updateData.embedding = await getEmbedding(title);
    }

    const { data, error } = await supabase
      .from('fl_links')
      .update(updateData)
      .eq('id', id)
      .select('id, url, title, content, deadline, created_at');

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    time: new Date(),
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
