const { getSupabaseClient } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = getSupabaseClient();

    if (req.method === 'GET') {
      // GET /api/locations - Get all locations
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

      // Validation
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Nama tempat wajib diisi.' });
      }

      if (latitude === undefined || latitude === null) {
        return res.status(400).json({ success: false, message: 'Latitude wajib diisi.' });
      }

      if (longitude === undefined || longitude === null) {
        return res.status(400).json({ success: false, message: 'Longitude wajib diisi.' });
      }

      // Validate lat/lng range
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ success: false, message: 'Latitude harus antara -90 sampai 90.' });
      }

      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ success: false, message: 'Longitude harus antara -180 sampai 180.' });
      }

      const { data, error } = await supabase
        .from('locations')
        .insert([{
          name: name.trim(),
          category_id: category_id || null,
          description: description || null,
          address: address || null,
          latitude: lat,
          longitude: lng,
          google_maps_url: google_maps_url || null,
          photo_url: photo_url || null
        }])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  } catch (error) {
    console.error('Locations API error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error.' });
  }
};
