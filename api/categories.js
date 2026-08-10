const { getSupabaseClient } = require('./db');

// ── Allowed origin for CORS ──
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://pemetaan-xi.vercel.app';

// ── Helper: set CORS headers ──
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ── Helper: check auth token ──
async function checkAuth(req, supabase) {
  var authHeader = req.headers && req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, message: 'Autentikasi diperlukan.' };
  }

  var token = authHeader.substring(7);
  try {
    var { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) {
      return { authenticated: false, message: 'Token tidak valid.' };
    }
    return { authenticated: true, user: data.user };
  } catch (e) {
    return { authenticated: false, message: 'Autentikasi gagal.' };
  }
}

module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = getSupabaseClient();

    if (req.method === 'GET') {
      // GET /api/categories - Get all categories (public)
      let { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;

      return res.status(200).json({ success: true, data: data || [] });
    }

    if (req.method === 'POST') {
      // POST /api/categories - Create category (admin only)
      var authResult = await checkAuth(req, supabase);
      if (!authResult.authenticated) {
        return res.status(401).json({ success: false, message: authResult.message });
      }

      const { name, icon, color } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'Nama kategori wajib diisi.' });
      }

      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, icon: icon || 'fa-map-pin', color: color || '#22c55e' }])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  } catch (error) {
    console.error('Categories API error:', error.message);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan. Silakan coba lagi.' });
  }
};
