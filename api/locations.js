const { getSupabaseClient } = require('./db');

// ── Allowed origin for CORS ──
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://pemetaan.vercel.app';

// ── Helper: sanitize string input ──
function sanitizeString(str, maxLen) {
  maxLen = maxLen || 200;
  if (typeof str !== 'string' || str.trim().length === 0) return null;
  // Strip HTML tags and dangerous characters
  var sanitized = str.trim()
    .replace(/<[^>]*>/g, '')           // Remove HTML tags
    .replace(/javascript:/gi, '')      // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '')        // Remove event handlers (onclick=, onerror=, etc.)
    .replace(/[<>\"'`;]+/g, '');       // Remove remaining dangerous chars
  return sanitized.substring(0, maxLen);
}

// ── Helper: validate URL ──
function isValidUrl(str) {
  if (!str || typeof str !== 'string') return null;
  try {
    var url = new URL(str);
    // Only allow http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return str.substring(0, 500);
  } catch (e) {
    return null;
  }
}

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
      // GET /api/locations - Get all locations (public)
      let { data, error } = await supabase
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({ success: true, data: data || [] });
    }

    if (req.method === 'POST') {
      // POST /api/locations - Create location (admin only)
      var authResult = await checkAuth(req, supabase);
      if (!authResult.authenticated) {
        return res.status(401).json({ success: false, message: authResult.message });
      }

      const {
        name,
        category_id,
        description,
        address,
        latitude,
        longitude,
        google_maps_url,
        photo_url
      } = req.body;

      // Sanitize and validate name
      var sanitizedName = sanitizeString(name, 150);
      if (!sanitizedName) {
        return res.status(400).json({ success: false, message: 'Nama tempat wajib diisi.' });
      }

      // Validate lat/lng
      if (latitude === undefined || latitude === null) {
        return res.status(400).json({ success: false, message: 'Latitude wajib diisi.' });
      }
      if (longitude === undefined || longitude === null) {
        return res.status(400).json({ success: false, message: 'Longitude wajib diisi.' });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ success: false, message: 'Latitude harus antara -90 sampai 90.' });
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ success: false, message: 'Longitude harus antara -180 sampai 180.' });
      }

      // Validate and sanitize optional fields
      var sanitizedDescription = sanitizeString(description, 1000);
      var sanitizedAddress = sanitizeString(address, 300);
      var validatedMapsUrl = isValidUrl(google_maps_url);
      var validatedPhotoUrl = isValidUrl(photo_url);

      const { data, error } = await supabase
        .from('locations')
        .insert([{
          name: sanitizedName,
          category_id: category_id || null,
          description: sanitizedDescription || null,
          address: sanitizedAddress || null,
          latitude: lat,
          longitude: lng,
          google_maps_url: validatedMapsUrl || null,
          photo_url: validatedPhotoUrl || null
        }])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  } catch (error) {
    console.error('Locations API error:', error.message);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan. Silakan coba lagi.' });
  }
};
