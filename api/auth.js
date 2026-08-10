const { getSupabaseAuthClient } = require('./db');

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
    const supabase = getSupabaseAuthClient();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi.'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      // Safe server-side logging (no sensitive data)
      console.error('Supabase auth error:', {
        status: error.status,
        name: error.name,
        message: error.message
      });

      if (error.status === 401 || error.message?.includes('Invalid')) {
        return res.status(401).json({
          success: false,
          message: 'Email atau password salah.'
        });
      }
      throw error;
    }

    // Return user data (without sensitive info)
    const user = data.user;
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
          expires_at: data.session.expires_at
        }
      }
    });

  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Login gagal.' });
  }
};
