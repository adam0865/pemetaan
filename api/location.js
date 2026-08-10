const { getSupabaseClient } = require('./db');

// ── Allowed origin for CORS ──
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://pemetaan-xi.vercel.app';

// ── Helper: sanitize string input ──
function sanitizeString(str, maxLen) {
  maxLen = maxLen || 200;
  if (typeof str !== 'string' || str.trim().length === 0) return null;
  var sanitized = str.trim()
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[<>\"'`;]+/g, '');
  return sanitized.substring(0, maxLen);
}

// ── Helper: validate URL ──
function isValidUrl(str) {
  if (!str || typeof str !== 'string') return null;
  try {
    var url = new URL(str);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return str.substring(0, 500);
  } catch (e) {
    return null;
  }
}

// ── Helper: set CORS headers ──
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
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

  const id = req.query.id;

  if (!id) {
    return res.status(400).json({ success: false, message: 'ID lokasi diperlukan.' });
  }

  try {
    const supabase = getSupabaseClient();

    if (req.method === 'GET') {
      // GET /api/locations/:id - Get single location (public)
      const { data, error } = await supabase
        .from('locations')
        .select(`
          *,
          categories (
            id,
            name,
            icon,
            color
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ success: false, message: 'Lokasi tidak ditemukan.' });
        }
        throw error;
      }

      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'PUT' || req.method === 'DELETE') {
      // PUT /api/locations/:id - Update location (admin only)
      // DELETE /api/locations/:id - Delete location (admin only)
      var authResult = await checkAuth(req, supabase);
      if (!authResult.authenticated) {
        return res.status(401).json({ success: false, message: authResult.message });
      }
    }

    if (req.method === 'PUT') {
      // PUT /api/locations/:id - Update location (admin only)
      const updates = req.body;
      const allowedFields = ['name', 'category_id', 'description', 'address', 'latitude', 'longitude', 'google_maps_url', 'photo_url'];
      const filtered = {};

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          if (field === 'name') {
            var sanitized = sanitizeString(updates[field], 150);
            if (sanitized) filtered[field] = sanitized;
          } else if (field === 'description' || field === 'address') {
            var sanitized = sanitizeString(updates[field], field === 'description' ? 1000 : 300);
            filtered[field] = sanitized || null;
          } else if (field === 'google_maps_url' || field === 'photo_url') {
            var validated = isValidUrl(updates[field]);
            filtered[field] = validated || null;
          } else {
            filtered[field] = updates[field];
          }
        }
      }

      // Validate lat/lng if provided
      if (filtered.latitude !== undefined) {
        const lat = parseFloat(filtered.latitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          return res.status(400).json({ success: false, message: 'Latitude harus antara -90 sampai 90.' });
        }
        filtered.latitude = lat;
      }

      if (filtered.longitude !== undefined) {
        const lng = parseFloat(filtered.longitude);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          return res.status(400).json({ success: false, message: 'Longitude harus antara -180 sampai 180.' });
        }
        filtered.longitude = lng;
      }

      // Add updated_at
      filtered.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('locations')
        .update(filtered)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ success: false, message: 'Lokasi tidak ditemukan.' });
        }
        throw error;
      }

      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'DELETE') {
      // DELETE /api/locations/:id - Delete location (admin only)
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ success: true, message: 'Lokasi berhasil dihapus.' });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  } catch (error) {
    console.error(`Location ${id} API error:`, error.message);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan. Silakan coba lagi.' });
  }
};
