const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// ── Allowed origin for CORS ──
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://pemetaan.vercel.app';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      return res.status(500).json({ success: false, message: 'Supabase credentials not configured.' });
    }

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Parse multipart form data manually (simple parser for single file)
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ success: false, message: 'Content-Type harus multipart/form-data.' });
    }

    // Extract boundary
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
    if (!boundaryMatch) {
      return res.status(400).json({ success: false, message: 'Boundary tidak ditemukan.' });
    }

    const boundary = '--' + (boundaryMatch[1] || boundaryMatch[2]);

    // Read body as buffer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    // Parse parts
    const parts = body.toString('utf-8').split(boundary).filter(p => p.trim() && p !== '--' && p !== '--\r\n');

    let fileBuffer = null;
    let fileName = null;
    let fileType = null;

    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;

      const header = part.substring(0, headerEnd);
      const content = part.substring(headerEnd + 4);

      // Check if this part has filename (file upload)
      const filenameMatch = header.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        fileName = filenameMatch[1];
        const contentTypeMatch = header.match(/Content-Type:\s*([^\r\n]+)/);
        fileType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';

        // Remove trailing \r\n from content
        fileBuffer = Buffer.from(content.substring(0, content.length - 2), 'utf-8');
      }
    }

    if (!fileBuffer || !fileName) {
      return res.status(400).json({ success: false, message: 'File tidak ditemukan dalam request.' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        message: 'Jenis file tidak diizinkan. Hanya JPG, PNG, dan WEBP.'
      });
    }

    // Validate file size (max 5MB)
    if (fileBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Ukuran file terlalu besar. Maksimal 5MB.'
      });
    }

    // Generate unique filename
    const ext = path.extname(fileName).toLowerCase();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const uploadPath = `location-photos/${timestamp}_${randomStr}${ext}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('location-photos')
      .upload(uploadPath, fileBuffer, {
        contentType: fileType,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('location-photos')
      .getPublicUrl(uploadPath);

    return res.status(200).json({
      success: true,
      data: {
        url: publicUrl,
        path: uploadPath,
        originalName: fileName
      }
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Upload gagal.' });
  }
};
