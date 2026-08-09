const { getSupabaseClient } = require('../db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
      // GET /api/locations/:id - Get single location
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

    if (req.method === 'PUT') {
      // PUT /api/locations/:id - Update location (admin only)
      const updates = req.body;
      const allowedFields = ['name', 'category_id', 'description', 'address', 'latitude', 'longitude', 'google_maps_url', 'photo_url'];
      const filtered = {};

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filtered[field] = updates[field];
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

      if (filtered.name) {
        filtered.name = filtered.name.trim();
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
    console.error(`Location ${id} API error:`, error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error.' });
  }
};
