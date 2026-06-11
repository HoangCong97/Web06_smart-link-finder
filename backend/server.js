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

// Biến cache lưu trữ cấu hình hệ thống động trong RAM
let systemSettings = {
  rate_limiting: {
    enabled: true,
    login_limit: 10,
    create_link_limit: 10,
    analyze_limit: 5,
    search_limit: 15,
    click_limit: 30
  },
  permissions: {
    guest: ["search_links", "view_links", "click_link"],
    manager: ["create_link", "edit_link", "delete_link", "analyze_link"]
  },
  system: {
    maintenance_mode: false,
    log_retention_days: 30,
    default_search_limit: 9,
    default_search_threshold: 0.3,
    show_priority_score: true
  }
};

// Hàm tải cấu hình hệ thống từ Supabase fl_settings
async function loadSystemSettings() {
  try {
    const { data, error } = await supabase
      .from('fl_settings')
      .select('*');

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('relation "public.fl_settings" does not exist')) {
        console.warn('WARNING: Bảng "fl_settings" chưa tồn tại. Hãy chạy lệnh trong backend/init.db.sql để khởi tạo bảng.');
      } else {
        console.error('Lỗi tải cấu hình hệ thống:', error.message);
      }
      return;
    }

    if (data && data.length > 0) {
      data.forEach(item => {
        if (item.key === 'rate_limiting') {
          systemSettings.rate_limiting = { ...systemSettings.rate_limiting, ...item.value };
        } else if (item.key === 'permissions') {
          systemSettings.permissions = { ...systemSettings.permissions, ...item.value };
        } else if (item.key === 'system') {
          systemSettings.system = { ...systemSettings.system, ...item.value };
        }
      });
      console.log('Đã tải và đồng bộ cấu hình hệ thống động từ database.');
    } else {
      console.log('Bảng fl_settings rỗng. Tiến hành seed cấu hình mặc định...');
      const seedPromises = Object.keys(systemSettings).map(key =>
        supabase.from('fl_settings').insert({ key, value: systemSettings[key] })
      );
      await Promise.all(seedPromises);
      console.log('Đã khởi tạo các cấu hình mặc định vào database.');
    }
  } catch (err) {
    console.error('Lỗi khi kết nối hoặc đồng bộ fl_settings:', err);
  }
}

// Chạy tải cấu hình khi server khởi động
loadSystemSettings();

// Middleware xác thực JWT bắt buộc
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

// Middleware xác thực JWT tùy chọn (dành cho Guest và phân quyền động)
const optionalJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>
    jwt.verify(token, jwtSecret, (err, user) => {
      if (!err) {
        req.user = user;
      }
      next();
    });
  } else {
    next();
  }
};

// Middleware phân quyền theo nhóm tĩnh cũ
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này' });
    }
    next();
  };
};

// Middleware phân quyền động theo cấu hình hệ thống
const checkPermission = (permission) => {
  return (req, res, next) => {
    // 1. Admin luôn có đầy đủ mọi quyền hạn
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    // Các quyền cơ bản mặc định mà Manager luôn được phép thực hiện (không bị chặn kể cả khi tắt đối với Khách)
    const basicPermissions = ['view_links', 'search_links', 'click_link'];

    // 2. Kiểm tra nếu là Manager
    if (req.user && req.user.role === 'manager') {
      const managerPerms = systemSettings.permissions.manager || [];
      const guestPerms = systemSettings.permissions.guest || [];
      if (
        managerPerms.includes(permission) ||
        guestPerms.includes(permission) ||
        basicPermissions.includes(permission)
      ) {
        return next();
      }
      return res.status(403).json({ error: `Tài khoản Manager của bạn không có quyền thực hiện hành động này (${permission})` });
    }

    // 3. Kiểm tra nếu là Guest (Khách chưa đăng nhập)
    if (!req.user) {
      const guestPerms = systemSettings.permissions.guest || [];
      if (guestPerms.includes(permission)) {
        return next();
      }
      return res.status(403).json({ error: `Vui lòng đăng nhập để thực hiện hành động này.` });
    }

    return res.status(403).json({ error: 'Không xác định được quyền hạn truy cập' });
  };
};

// Middleware kiểm tra chế độ bảo trì hệ thống
const maintenanceModeCheck = (req, res, next) => {
  // Chỉ chặn các yêu cầu nếu đang bật chế độ bảo trì
  // Tài khoản Admin được bỏ qua (bypass) hoàn toàn chế độ bảo trì để xử lý sự cố
  if (systemSettings.system.maintenance_mode) {
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
      return res.status(503).json({ error: 'Hệ thống đang bảo trì. Vui lòng quay lại sau.' });
    }
  }
  next();
};

// Bộ lưu trữ in-memory cho rate limit
const rateLimiters = {};

// Tự động dọn dẹp định kỳ các địa chỉ IP không còn hoạt động để tránh rò rỉ RAM (memory leak)
// Loại bỏ các timestamp cũ hơn 1 giờ, nếu IP không còn hoạt động thì xóa hoàn toàn
setInterval(() => {
  const now = Date.now();
  for (const key in rateLimiters) {
    rateLimiters[key] = rateLimiters[key].filter(timestamp => now - timestamp < 3600000);
    if (rateLimiters[key].length === 0) {
      delete rateLimiters[key];
    }
  }
}, 10 * 60 * 1000); // Chạy mỗi 10 phút

// Hàm factory tạo middleware giới hạn tần suất yêu cầu (Rate Limiter) động
const createRateLimiter = ({ windowMs, maxSettingKey, defaultMax, message }) => {
  const limiterId = Math.random().toString(36).substring(2, 9);
  return (req, res, next) => {
    // 1. Kiểm tra nếu tính năng giới hạn tần suất bị tắt trên toàn hệ thống
    if (!systemSettings.rate_limiting || !systemSettings.rate_limiting.enabled) {
      return next();
    }

    // 2. Lấy giới hạn tối đa từ cấu hình động hoặc dùng mặc định
    const max = (systemSettings.rate_limiting && systemSettings.rate_limiting[maxSettingKey]) !== undefined 
      ? systemSettings.rate_limiting[maxSettingKey] 
      : defaultMax;

    // Lấy IP của Client (hỗ trợ proxy nếu có)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const key = `${limiterId}:${ip}`;
    const now = Date.now();

    if (!rateLimiters[key]) {
      rateLimiters[key] = [];
    }

    // Lọc lại chỉ giữ các request nằm trong khu thời gian windowMs gần nhất
    rateLimiters[key] = rateLimiters[key].filter(timestamp => now - timestamp < windowMs);

    if (rateLimiters[key].length >= max) {
      return res.status(429).json({ error: message });
    }

    // Ghi nhận request mới
    rateLimiters[key].push(now);
    next();
  };
};

// Khởi tạo các rate limiter cụ thể đọc động theo cấu hình
const loginLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxSettingKey: 'login_limit',
  defaultMax: 10,
  message: 'Yêu cầu đăng nhập quá thường xuyên. Vui lòng thử lại sau 1 phút.'
});

const createLinkLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxSettingKey: 'create_link_limit',
  defaultMax: 10,
  message: 'Yêu cầu tạo liên kết quá thường xuyên. Vui lòng thử lại sau 1 phút.'
});

const analyzeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxSettingKey: 'analyze_limit',
  defaultMax: 5,
  message: 'Yêu cầu phân tích văn bản quá thường xuyên. Vui lòng thử lại sau 1 phút.'
});

const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxSettingKey: 'search_limit',
  defaultMax: 15,
  message: 'Yêu cầu tìm kiếm quá thường xuyên. Vui lòng thử lại sau 1 phút.'
});

const clickLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxSettingKey: 'click_limit',
  defaultMax: 30,
  message: 'Yêu cầu truy cập liên kết quá thường xuyên. Vui lòng thử lại sau 1 phút.'
});

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
      console.log('');
    }
  } catch (err) {
    console.error('Lỗi khi seed tài khoản admin:', err);
  }
}

// Chạy seed admin khi khởi động
seedAdminUser();

// Hàm ghi log hoạt động hệ thống
async function logAction(actionType, username, details) {
  try {
    const { error } = await supabase
      .from('fl_logs')
      .insert([
        {
          action_type: actionType,
          username: username || 'Guest',
          details: details || ''
        }
      ]);
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('fl_logs') || error.message.includes('relation "public.fl_logs" does not exist')) {
        console.warn('WARNING: Bảng "fl_logs" chưa tồn tại trong database. Vui lòng chạy nội dung file backend/init.db.sql trong SQL Editor của Supabase để tạo bảng fl_logs.');
      } else {
        console.error('Lỗi khi ghi log hoạt động:', error.message);
      }
    }
  } catch (err) {
    console.error('Lỗi khi ghi log hoạt động:', err);
  }
}

// Kiểm tra bảng fl_logs khi khởi động
async function checkLogsTable() {
  try {
    const { error } = await supabase
      .from('fl_logs')
      .select('id')
      .limit(1);
    if (error && (error.code === 'PGRST205' || error.message.includes('fl_logs') || error.message.includes('relation "public.fl_logs" does not exist'))) {
      console.warn('WARNING: Bảng "fl_logs" chưa tồn tại trong database. Hãy chạy lệnh SQL trong backend/init.db.sql để tạo bảng.');
    }
  } catch (err) {
    // Bỏ qua
  }
}
checkLogsTable();

// Tự động dọn dẹp các bản ghi nhật ký hoạt động cũ
async function autoPruneLogs() {
  try {
    const retentionDays = (systemSettings.system && systemSettings.system.log_retention_days) || 30;
    const pruneDate = new Date();
    pruneDate.setDate(pruneDate.getDate() - retentionDays);
    const pruneDateISO = pruneDate.toISOString();

    console.log(`Tiến hành tự động dọn dẹp nhật ký cũ hơn ${retentionDays} ngày (trước ngày ${pruneDate.toLocaleDateString('vi-VN')})...`);
    
    // Xóa các logs có created_at nhỏ hơn số ngày lưu giữ
    const { error } = await supabase
      .from('fl_logs')
      .delete()
      .lt('created_at', pruneDateISO);

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('fl_logs') || error.message.includes('relation "public.fl_logs" does not exist')) {
        // Bảng fl_logs chưa tồn tại, bỏ qua cảnh báo
      } else {
        console.error('Lỗi khi tự động dọn dẹp nhật ký cũ:', error.message);
      }
    } else {
      console.log('Tự động dọn dẹp nhật ký cũ hoàn tất.');
    }

    // Xóa các clicks cũ hơn 3 ngày trong bảng fl_link_clicks phục vụ đếm độ hot
    const pruneClicksDate = new Date();
    pruneClicksDate.setDate(pruneClicksDate.getDate() - 3);
    const { error: clicksPruneError } = await supabase
      .from('fl_link_clicks')
      .delete()
      .lt('clicked_at', pruneClicksDate.toISOString());

    if (clicksPruneError) {
      if (clicksPruneError.code !== 'PGRST205' && !clicksPruneError.message.includes('relation "public.fl_link_clicks" does not exist')) {
        console.error('Lỗi khi tự động dọn dẹp click cũ:', clicksPruneError.message);
      }
    } else {
      console.log('Tự động dọn dẹp click cũ (> 3 ngày) hoàn tất.');
    }
  } catch (err) {
    console.error('Lỗi khi tự động dọn dẹp nhật ký và click cũ:', err);
  }
}

// Chạy dọn dẹp logs khi server khởi động
autoPruneLogs();

// Chạy dọn dẹp logs định kỳ mỗi 24 giờ
setInterval(autoPruneLogs, 24 * 60 * 60 * 1000);


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
app.post('/api/auth/login', loginLimiter, async (req, res) => {
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
    await logAction('CREATE_USER', req.user.username, `Tạo tài khoản manager mới: "${username}"`);
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
    await logAction('UPDATE_USER', req.user.username, `Cập nhật thông tin manager ID: ${id}, Username mới: "${username || existing.username}"`);
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
    await logAction('DELETE_USER', req.user.username, `Xóa tài khoản manager ID: ${id}, Username: "${existing.username}"`);
    res.json({ success: true, message: 'Đã xóa manager thành công' });
  } catch (err) {
    console.error('Lỗi xóa manager:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/auth/change-password (Admin & Manager: tự đổi mật khẩu)
app.put('/api/auth/change-password', authenticateJWT, requireRole(['admin', 'manager']), async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  }

  try {
    // Lấy thông tin user hiện tại từ database
    const { data: user, error: fetchError } = await supabase
      .from('fl_users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản người dùng' });
    }

    // Xác minh mật khẩu hiện tại
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Mật khẩu hiện tại không chính xác' });
    }

    // Hash mật khẩu mới và cập nhật
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase
      .from('fl_users')
      .update({ password: hashedNewPassword })
      .eq('id', req.user.id);

    if (updateError) throw updateError;

    await logAction('CHANGE_PASSWORD', req.user.username, `Đổi mật khẩu tài khoản thành công`);
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error('Lỗi đổi mật khẩu:', err);
    res.status(500).json({ error: err.message || 'Lỗi máy chủ nội bộ' });
  }
});

// --- Settings APIs ---

// GET /api/settings (Public settings for frontend initialization)
app.get('/api/settings', async (req, res) => {
  res.json({
    guest_permissions: systemSettings.permissions.guest,
    maintenance_mode: systemSettings.system.maintenance_mode,
    default_search_limit: systemSettings.system.default_search_limit,
    default_search_threshold: systemSettings.system.default_search_threshold,
    show_priority_score: systemSettings.system.show_priority_score !== undefined ? systemSettings.system.show_priority_score : true
  });
});

// GET /api/admin/settings (Admin-only: get all configuration)
app.get('/api/admin/settings', authenticateJWT, requireRole(['admin']), async (req, res) => {
  res.json(systemSettings);
});

// PUT /api/admin/settings (Admin-only: update configuration)
app.put('/api/admin/settings', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const { rate_limiting, permissions, system } = req.body;

  try {
    const updates = [];

    if (rate_limiting) {
      systemSettings.rate_limiting = { ...systemSettings.rate_limiting, ...rate_limiting };
      updates.push(
        supabase
          .from('fl_settings')
          .upsert({ key: 'rate_limiting', value: systemSettings.rate_limiting })
      );
    }

    if (permissions) {
      systemSettings.permissions = { ...systemSettings.permissions, ...permissions };
      updates.push(
        supabase
          .from('fl_settings')
          .upsert({ key: 'permissions', value: systemSettings.permissions })
      );
    }

    if (system) {
      systemSettings.system = { ...systemSettings.system, ...system };
      updates.push(
        supabase
          .from('fl_settings')
          .upsert({ key: 'system', value: systemSettings.system })
      );
    }

    await Promise.all(updates);
    await logAction('UPDATE_SETTINGS', req.user.username, 'Cập nhật cấu hình hệ thống');

    res.json({ success: true, settings: systemSettings });
  } catch (err) {
    console.error('Lỗi cập nhật cấu hình hệ thống:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * Tính điểm ưu tiên hiển thị động (Smart Score) cho liên kết
 * @param {object} link 
 * @param {number} clicks_3d 
 * @param {number} clicks_30d 
 * @returns {number}
 */
function calculatePriorityScore(link, clicks_3d = 0, clicks_30d = 0) {
  let score = 0;

  // 1. Ghim (is_pinned): +10000 điểm
  if (link.is_pinned) {
    score += 10000;
  }

  // 2. Lượt click (Popularity)
  score += clicks_3d * 15;
  score += clicks_30d * 2;

  // 3. Độ mới (Recency)
  const now = new Date();
  const createdAt = new Date(link.created_at);
  const diffCreatedMs = now - createdAt;
  const diffCreatedHours = diffCreatedMs / (1000 * 60 * 60); // Đơn vị: giờ
  if (diffCreatedHours >= 0 && diffCreatedHours <= 24) {
    score += (24 - diffCreatedHours) * 2;
  }

  // 4. Hạn chót & Phạt quá hạn (Urgency & Expired)
  if (link.deadline) {
    const deadlineTime = new Date(link.deadline);
    const diffDeadlineMs = deadlineTime - now;
    const diffDeadlineHours = diffDeadlineMs / (1000 * 60 * 60); // Đơn vị: giờ (dương: còn hạn, âm: quá hạn)

    if (diffDeadlineHours >= 0) {
      // Chưa quá hạn
      if (diffDeadlineHours <= 48) {
        score += (48 - diffDeadlineHours) * 5;
      } else {
        score += 5;
      }
    } else {
      // Đã quá hạn
      const expiredHours = -diffDeadlineHours;
      if (expiredHours <= 24) {
        score -= expiredHours * 10;
      } else {
        score -= 240; // Phạt tối đa sau 24h
      }
    }
  }

  return Math.round(score * 100) / 100; // Làm tròn 2 chữ số thập phân
}

// 1. Get all links sorted by smart priority score
app.get('/api/links', optionalJWT, maintenanceModeCheck, checkPermission('view_links'), async (req, res) => {
  try {
    // A. Lấy tất cả các liên kết từ Database
    const { data: links, error: linksError } = await supabase
      .from('fl_links')
      .select('id, url, title, content, deadline, click_count, created_at, is_pinned');

    if (linksError) throw linksError;

    // B. Lấy các clicks trong 30 ngày qua để tính toán độ hot
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: clicksData, error: clicksError } = await supabase
      .from('fl_link_clicks')
      .select('link_id, clicked_at')
      .gte('clicked_at', thirtyDaysAgo.toISOString());

    // Nếu bảng fl_link_clicks chưa được tạo (lỗi chưa chạy migration), gán clicksData rỗng để không bị sập API
    const isTableMissing = clicksError && (
      clicksError.message.includes('relation "public.fl_link_clicks" does not exist') ||
      clicksError.message.includes('fl_link_clicks') ||
      clicksError.message.includes('schema cache') ||
      clicksError.code === 'PGRST205'
    );
    const safeClicksData = isTableMissing ? [] : clicksData || [];
    
    if (clicksError && !isTableMissing) {
      throw clicksError;
    }

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const clicks3dMap = {};
    const clicks30dMap = {};

    safeClicksData.forEach(row => {
      const clickedAt = new Date(row.clicked_at);
      // Đếm click 30 ngày
      clicks30dMap[row.link_id] = (clicks30dMap[row.link_id] || 0) + 1;
      // Đếm click 3 ngày
      if (clickedAt >= threeDaysAgo) {
        clicks3dMap[row.link_id] = (clicks3dMap[row.link_id] || 0) + 1;
      }
    });

    // C. Tính toán điểm số ưu tiên cho từng liên kết
    const linksWithScores = links.map(link => {
      const c3d = clicks3dMap[link.id] || 0;
      const c30d = clicks30dMap[link.id] || 0;
      const score = calculatePriorityScore(link, c3d, c30d);
      return {
        ...link,
        priority_score: score,
        clicks_3d: c3d,
        clicks_30d: c30d
      };
    });

    // D. Sắp xếp theo điểm số ưu tiên giảm dần, sau đó là ngày tạo giảm dần
    linksWithScores.sort((a, b) => {
      if (b.priority_score !== a.priority_score) {
        return b.priority_score - a.priority_score;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    res.json(linksWithScores);
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 2. Create new link with AI title embedding
app.post('/api/links', authenticateJWT, maintenanceModeCheck, checkPermission('create_link'), createLinkLimiter, async (req, res) => {
  const { url, title, content, deadline } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Use URL as title if not provided
  const targetTitle = title || url;

  try {
    // Kiểm tra trùng lặp URL trước khi gọi AI và lưu
    const { data: existingLink, error: checkError } = await supabase
      .from('fl_links')
      .select('id, title')
      .eq('url', url)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingLink) {
      return res.status(400).json({ error: `Liên kết này đã tồn tại trong hệ thống với tiêu đề: "${existingLink.title}"` });
    }

    console.log(`Generating embedding for title: "${targetTitle}"`);
    await logAction('GEMINI_EMBEDDING', req.user.username, `Tạo embedding cho tiêu đề: "${targetTitle}"`);
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
      .select('id, url, title, content, deadline, click_count, created_at, is_pinned');

    if (error) throw error;
    await logAction('CREATE_LINK', req.user.username, `Thêm liên kết mới: "${targetTitle}" (${url})`);
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 2.5 Analyze raw text to extract and create a link with embedding using DeepSeek V4 Flash
app.post('/api/links/analyze', authenticateJWT, maintenanceModeCheck, checkPermission('analyze_link'), analyzeLimiter, async (req, res) => {
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
    await logAction('DEEPSEEK_ANALYZE', req.user.username, `Phân tích văn bản thô: "${rawText.substring(0, 80)}${rawText.length > 80 ? '...' : ''}"`);

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

    // Kiểm tra trùng lặp URL trước khi gọi AI tạo embedding và lưu
    const { data: existingLink, error: checkError } = await supabase
      .from('fl_links')
      .select('id, title')
      .eq('url', parsed.url)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingLink) {
      return res.status(400).json({ error: `Liên kết trích xuất đã tồn tại trong hệ thống với tiêu đề: "${existingLink.title}"` });
    }

    const titleToEmbed = parsed.title || parsed.url;
    console.log(`Generating embedding for extracted title: "${titleToEmbed}"`);
    await logAction('GEMINI_EMBEDDING', req.user.username, `Tạo embedding cho tiêu đề trích xuất: "${titleToEmbed}"`);
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
      .select('id, url, title, content, deadline, click_count, created_at, is_pinned');

    if (error) throw error;
    await logAction('CREATE_LINK', req.user.username, `Thêm liên kết trích xuất từ AI: "${titleToEmbed}" (${parsed.url})`);
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error analyzing and creating link:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 3. Search links semantically using vector similarity merged with FTS
app.post('/api/search', optionalJWT, maintenanceModeCheck, checkPermission('search_links'), searchLimiter, async (req, res) => {
  const { query, threshold, limit } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  // Sử dụng cấu hình ngưỡng tương đồng và giới hạn kết quả mặc định từ hệ thống nếu client không gửi lên
  const matchThreshold = threshold !== undefined ? parseFloat(threshold) : (systemSettings.system.default_search_threshold || 0.3);
  const matchLimit = limit !== undefined ? parseInt(limit, 10) : (systemSettings.system.default_search_limit || 9);

  try {
    // 1. Tìm kiếm Full-Text Search (Khớp từ khóa trực tiếp)
    // Loại bỏ các ký tự đặc biệt có thể ảnh hưởng đến parser .or() của Supabase
    const safeQuery = query.replace(/[(),.]/g, ' ').trim();
    let ftsResults = [];

    if (safeQuery) {
      console.log(`Executing keyword FTS for query: "${safeQuery}"`);
      const { data: ftsData, error: ftsError } = await supabase
        .from('fl_links')
        .select('id, url, title, content, deadline, click_count, created_at, is_pinned')
        .or(`title.ilike.%${safeQuery}%,content.ilike.%${safeQuery}%,url.ilike.%${safeQuery}%`)
        .limit(matchLimit);

      if (ftsError) {
        console.error('FTS query error:', ftsError);
      } else if (ftsData) {
        ftsResults = ftsData.map(item => ({
          ...item,
          similarity: 0.99 // Gán 99% khớp cho kết quả FTS
        }));
      }
    }

    // 2. Tìm kiếm Vector Semantic Search (Theo ngữ nghĩa AI)
    console.log(`Generating embedding for search query: "${query}"`);
    const searchUsername = req.user ? req.user.username : 'Guest';
    await logAction('GEMINI_EMBEDDING', searchUsername, `Tạo embedding tìm kiếm ngữ nghĩa: "${query}"`);
    const queryEmbedding = await getEmbedding(query);
    console.log(`Query embedding generated. Size: ${queryEmbedding.length}. Calling match_links...`);

    const { data: vectorData, error: vectorError } = await supabase.rpc('match_links', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchLimit
    });

    if (vectorError) throw vectorError;
    
    // Áp dụng fallback lấy is_pinned từ table nếu RPC match_links chưa được nâng cấp chữ ký trả về
    let vectorResults = vectorData || [];
    if (vectorResults.length > 0 && vectorResults[0].is_pinned === undefined) {
      const vectorIds = vectorResults.map(item => item.id);
      const { data: pinData } = await supabase
        .from('fl_links')
        .select('id, is_pinned')
        .in('id', vectorIds);
      if (pinData) {
        const pinMap = {};
        pinData.forEach(row => {
          pinMap[row.id] = row.is_pinned;
        });
        vectorResults = vectorResults.map(item => ({
          ...item,
          is_pinned: pinMap[item.id] || false
        }));
      }
    }

    // 3. Gộp kết quả và Loại bỏ trùng lặp (FTS ưu tiên 1, Vector ưu tiên 2)
    const combinedResults = [...ftsResults];
    const seenIds = new Set(ftsResults.map(item => item.id));

    for (const item of vectorResults) {
      if (!seenIds.has(item.id)) {
        combinedResults.push(item);
        seenIds.add(item.id);
      }
    }

    // 4. Tính toán priority_score cho các kết quả tìm kiếm
    const matchedIds = combinedResults.map(item => item.id);
    let clicks3dMap = {};
    let clicks30dMap = {};
    let fullLinksMap = {};

    if (matchedIds.length > 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Lấy click logs
      const { data: searchClicksData, error: searchClicksError } = await supabase
        .from('fl_link_clicks')
        .select('link_id, clicked_at')
        .in('link_id', matchedIds)
        .gte('clicked_at', thirtyDaysAgo.toISOString());

      const isTableMissing = searchClicksError && (
        searchClicksError.message.includes('relation "public.fl_link_clicks" does not exist') ||
        searchClicksError.message.includes('fl_link_clicks') ||
        searchClicksError.message.includes('schema cache') ||
        searchClicksError.code === 'PGRST205'
      );
      const safeSearchClicksData = isTableMissing ? [] : searchClicksData || [];

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      safeSearchClicksData.forEach(row => {
        const clickedAt = new Date(row.clicked_at);
        clicks30dMap[row.link_id] = (clicks30dMap[row.link_id] || 0) + 1;
        if (clickedAt >= threeDaysAgo) {
          clicks3dMap[row.link_id] = (clicks3dMap[row.link_id] || 0) + 1;
        }
      });

      // Lấy thông tin bổ sung như created_at, is_pinned nếu thiếu
      const { data: fullLinksData } = await supabase
        .from('fl_links')
        .select('id, created_at, is_pinned')
        .in('id', matchedIds);

      if (fullLinksData) {
        fullLinksData.forEach(row => {
          fullLinksMap[row.id] = row;
        });
      }
    }

    const resultsWithScores = combinedResults.map(item => {
      const c3d = clicks3dMap[item.id] || 0;
      const c30d = clicks30dMap[item.id] || 0;
      const extra = fullLinksMap[item.id] || {};
      
      const mergedItem = {
        ...item,
        is_pinned: extra.is_pinned !== undefined ? extra.is_pinned : (item.is_pinned || false),
        created_at: extra.created_at || item.created_at || new Date().toISOString(),
      };

      const score = calculatePriorityScore(mergedItem, c3d, c30d);
      
      return {
        ...mergedItem,
        priority_score: score,
        clicks_3d: c3d,
        clicks_30d: c30d
      };
    });

    // 5. Sắp xếp theo similarity giảm dần, nếu bằng nhau thì xếp theo priority_score giảm dần
    resultsWithScores.sort((a, b) => {
      const simA = a.similarity !== undefined ? a.similarity : 0;
      const simB = b.similarity !== undefined ? b.similarity : 0;
      if (Math.abs(simB - simA) > 0.0001) {
        return simB - simA;
      }
      if (b.priority_score !== a.priority_score) {
        return b.priority_score - a.priority_score;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // Trả về danh sách đã cắt theo giới hạn matchLimit
    res.json(resultsWithScores.slice(0, matchLimit));
  } catch (error) {
    console.error('Error searching links:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 4. Delete a link
app.delete('/api/links/:id', authenticateJWT, maintenanceModeCheck, checkPermission('delete_link'), async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('fl_links')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await logAction('DELETE_LINK', req.user.username, `Xóa liên kết ID: ${id}`);
    res.json({ success: true, message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 4.5. Update a link (Edit post/link)
app.put('/api/links/:id', authenticateJWT, maintenanceModeCheck, checkPermission('edit_link'), async (req, res) => {
  const { id } = req.params;
  const { url, title, content, deadline, is_pinned } = req.body;

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
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;

    if (title !== undefined && title !== existing.title) {
      updateData.title = title;
      console.log(`Title changed. Generating new embedding for: "${title}"`);
      await logAction('GEMINI_EMBEDDING', req.user.username, `Tạo embedding mới cho tiêu đề cập nhật: "${title}"`);
      updateData.embedding = await getEmbedding(title);
    }

    const { data, error } = await supabase
      .from('fl_links')
      .update(updateData)
      .eq('id', id)
      .select('id, url, title, content, deadline, click_count, created_at, is_pinned');

    if (error) throw error;
    await logAction('UPDATE_LINK', req.user.username, `Cập nhật liên kết ID: ${id}. Tiêu đề: "${title || existing.title}"`);
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/links/:id/click (Tăng số lượt click khi truy cập liên kết)
app.post('/api/links/:id/click', optionalJWT, maintenanceModeCheck, checkPermission('click_link'), clickLimiter, async (req, res) => {
  const { id } = req.params;
  try {
    // Lấy số lượt click hiện tại
    const { data: link, error: fetchError } = await supabase
      .from('fl_links')
      .select('click_count')
      .eq('id', id)
      .single();

    if (fetchError || !link) {
      return res.status(404).json({ error: 'Liên kết không tồn tại' });
    }

    const newClickCount = (link.click_count || 0) + 1;

    const { data, error: updateError } = await supabase
      .from('fl_links')
      .update({ click_count: newClickCount })
      .eq('id', id)
      .select('id, click_count');

    if (updateError) throw updateError;

    // Ghi nhận nhật ký click vào bảng fl_link_clicks để phục vụ tính độ hot
    const { error: clickLogError } = await supabase
      .from('fl_link_clicks')
      .insert([{ link_id: id }]);
    
    if (clickLogError) {
      console.error('Error inserting click log:', clickLogError);
    }
    
    const clickUsername = req.user ? req.user.username : 'Guest';
    await logAction('CLICK_LINK', clickUsername, `Click truy cập liên kết ID: ${id}. Tổng lượt click: ${newClickCount}`);
    res.json({ success: true, click_count: newClickCount });
  } catch (error) {
    console.error('Error incrementing click count:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Admin API: Kiểm tra trạng thái kết nối & lấy số lượng request AI
app.get('/api/admin/health-check', authenticateJWT, requireRole(['admin']), async (req, res) => {
  // Check Database Connection
  let dbStatus = 'disconnected';
  let dbError = null;
  try {
    const { error } = await supabase.from('fl_users').select('id').limit(1);
    if (error) throw error;
    dbStatus = 'connected';
  } catch (err) {
    dbError = err.message;
  }

  // Check Gemini Connection & Latency
  let geminiStatus = 'disconnected';
  let geminiError = null;
  let geminiLatency = null;
  if (geminiApiKey) {
    try {
      const start = Date.now();
      // Test embedding with a lightweight content and timeout
      const embedPromise = genAI.getGenerativeModel({ model: geminiModel }).embedContent({
        content: { parts: [{ text: 'ping' }] }
      });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Yêu cầu hết hạn (Timeout)')), 3000));
      await Promise.race([embedPromise, timeoutPromise]);
      geminiLatency = Date.now() - start;
      geminiStatus = 'connected';
    } catch (err) {
      geminiError = err.message;
    }
  } else {
    geminiError = 'Chưa cấu hình API Key';
  }

  // Check DeepSeek Connection & Latency
  let deepseekStatus = 'disconnected';
  let deepseekError = null;
  let deepseekLatency = null;
  if (deepseekApiKey) {
    try {
      const start = Date.now();
      const cleanBaseUrl = deepseekBaseUrl.endsWith('/') ? deepseekBaseUrl.slice(0, -1) : deepseekBaseUrl;
      const endpoint = cleanBaseUrl.includes('/v1') ? `${cleanBaseUrl}/chat/completions` : `${cleanBaseUrl}/v1/chat/completions`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekApiKey}`
        },
        body: JSON.stringify({
          model: deepseekModel,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        deepseekLatency = Date.now() - start;
        deepseekStatus = 'connected';
      } else {
        deepseekError = `HTTP ${response.status}`;
      }
    } catch (err) {
      deepseekError = err.message;
    }
  } else {
    deepseekError = 'Chưa cấu hình API Key';
  }

  // Lấy số lượng request của Gemini và DeepSeek từ log (theo ngày & tháng)
  let geminiRequests = { day: 0, month: 0 };
  let deepseekRequests = { day: 0, month: 0 };
  try {
    // Start of day in server local time
    const localToday = new Date();
    localToday.setHours(0, 0, 0, 0);
    const startOfDayISO = localToday.toISOString();

    // Start of month in server local time
    const localMonth = new Date();
    localMonth.setDate(1);
    localMonth.setHours(0, 0, 0, 0);
    const startOfMonthISO = localMonth.toISOString();

    // Gemini Day Count
    const { count: geminiDayCount, error: gdErr } = await supabase
      .from('fl_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'GEMINI_EMBEDDING')
      .gte('created_at', startOfDayISO);

    // Gemini Month Count
    const { count: geminiMonthCount, error: gmErr } = await supabase
      .from('fl_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'GEMINI_EMBEDDING')
      .gte('created_at', startOfMonthISO);

    if (!gdErr && !gmErr) {
      geminiRequests = {
        day: geminiDayCount || 0,
        month: geminiMonthCount || 0
      };
    }

    // DeepSeek Day Count
    const { count: deepseekDayCount, error: ddErr } = await supabase
      .from('fl_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'DEEPSEEK_ANALYZE')
      .gte('created_at', startOfDayISO);

    // DeepSeek Month Count
    const { count: deepseekMonthCount, error: dmErr } = await supabase
      .from('fl_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'DEEPSEEK_ANALYZE')
      .gte('created_at', startOfMonthISO);

    if (!ddErr && !dmErr) {
      deepseekRequests = {
        day: deepseekDayCount || 0,
        month: deepseekMonthCount || 0
      };
    }
  } catch (err) {
    console.error('Error fetching AI request counts:', err);
  }

  res.json({
    database: { status: dbStatus, error: dbError },
    gemini: { status: geminiStatus, latency: geminiLatency, error: geminiError, requestCount: geminiRequests },
    deepseek: { status: deepseekStatus, latency: deepseekLatency, error: deepseekError, requestCount: deepseekRequests }
  });
});

// Admin API: Xem và lọc logs
app.get('/api/admin/logs', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const { actionType, search, username, date, limit = 50, offset = 0 } = req.query;

  try {
    let queryBuilder = supabase
      .from('fl_logs')
      .select('*', { count: 'exact' });

    if (actionType) {
      queryBuilder = queryBuilder.eq('action_type', actionType);
    }

    if (username) {
      queryBuilder = queryBuilder.eq('username', username);
    }

    if (date) {
      const parts = date.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        
        const start = new Date(year, month, day, 0, 0, 0, 0);
        const end = new Date(year, month, day, 23, 59, 59, 999);
        
        queryBuilder = queryBuilder
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
      }
    }

    if (search) {
      queryBuilder = queryBuilder.or(`username.ilike.%${search}%,details.ilike.%${search}%`);
    }

    const { data, count, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      logs: data || [],
      total: count || 0
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách log:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.get("/health", async (req, res) => {
  try {
    // Truy vấn siêu nhẹ tới DB để giữ kết nối database luôn ấm (warm)
    await supabase.from('fl_users').select('id').limit(1);
    res.status(200).json({
      status: "ok",
      database: "connected",
      time: new Date(),
    });
  } catch (err) {
    console.error("Healthcheck DB error:", err.message);
    res.status(200).json({
      status: "ok",
      database: "disconnected",
      error: err.message,
      time: new Date(),
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
