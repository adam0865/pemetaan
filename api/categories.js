const { getSupabaseClient } = require('../db');

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
      // GET /api/categories - Get all categories
      let { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;

      return res.status(200).json({ success: true, data: data || [] });
    }

    if (req.method === 'POST') {
      // POST /api/categories - Create category (admin only)
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
    console.error('Categories API error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error.' });
  }
};
