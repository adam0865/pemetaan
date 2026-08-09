/**
 * API Client untuk Peta Desa Cimenteng
 * Berkomunikasi dengan Vercel serverless functions
 * Menggunakan Supabase sebagai backend database
 */

(function(global) {
  'use strict';

  var API_BASE = ''; // Relative path - works on localhost and Vercel

  // ── Helper: fetch with error handling ──
  function request(method, path, body) {
    var options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Add auth token if available
    var session = getCimentengSession();
    if (session && session.access_token) {
      options.headers['Authorization'] = 'Bearer ' + session.access_token;
    }

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    return fetch(API_BASE + path, options).then(function(response) {
      return response.json().then(function(data) {
        if (!response.ok) {
          var msg = data && data.message ? data.message : 'Request gagal.';
          throw new Error(msg);
        }
        return data;
      });
    });
  }

  // ── Session management ──
  function getCimentengSession() {
    try {
      var raw = localStorage.getItem('cimenteng_session');
      if (!raw) return null;
      var session = JSON.parse(raw);
      // Check expiry
      if (session.expires_at && Date.now() >= session.expires_at * 1000) {
        localStorage.removeItem('cimenteng_session');
        return null;
      }
      return session;
    } catch (e) {
      return null;
    }
  }

  function setCimentengSession(session) {
    try {
      localStorage.setItem('cimenteng_session', JSON.stringify(session));
    } catch (e) {
      // localStorage might be full or disabled
    }
  }

  function clearCimentengSession() {
    try {
      localStorage.removeItem('cimenteng_session');
    } catch (e) {}
  }

  // ── Public API ──
  var CimentengAPI = {
    /**
     * Get all locations with category data
     * @returns {Promise<{success: boolean, data: Array}>}
     */
    getLocations: function() {
      return request('GET', '/api/locations');
    },

    /**
     * Get single location by ID
     * @param {string} id
     * @returns {Promise<{success: boolean, data: Object}>}
     */
    getLocation: function(id) {
      return request('GET', '/api/locations/' + encodeURIComponent(id));
    },

    /**
     * Create new location
     * @param {Object} data - {name, category_id, description, address, latitude, longitude, google_maps_url, photo_url}
     * @returns {Promise<{success: boolean, data: Object}>}
     */
    createLocation: function(data) {
      return request('POST', '/api/locations', data);
    },

    /**
     * Update location
     * @param {string} id
     * @param {Object} updates
     * @returns {Promise<{success: boolean, data: Object}>}
     */
    updateLocation: function(id, updates) {
      return request('PUT', '/api/locations/' + encodeURIComponent(id), updates);
    },

    /**
     * Delete location
     * @param {string} id
     * @returns {Promise<{success: boolean, message: string}>}
     */
    deleteLocation: function(id) {
      return request('DELETE', '/api/locations/' + encodeURIComponent(id));
    },

    /**
     * Get all categories
     * @returns {Promise<{success: boolean, data: Array}>}
     */
    getCategories: function() {
      return request('GET', '/api/categories');
    },

    /**
     * Upload photo to Supabase Storage
     * @param {File} file
     * @returns {Promise<{success: boolean, data: {url: string, path: string}}>}
     */
    uploadPhoto: function(file) {
      var session = getCimentengSession();
      var headers = {};
      if (session && session.access_token) {
        headers['Authorization'] = 'Bearer ' + session.access_token;
      }

      var formData = new FormData();
      formData.append('photo', file);

      return fetch(API_BASE + '/api/upload', {
        method: 'POST',
        headers: headers,
        body: formData
      }).then(function(response) {
        return response.json().then(function(data) {
          if (!response.ok) {
            var msg = data && data.message ? data.message : 'Upload gagal.';
            throw new Error(msg);
          }
          return data;
        });
      });
    },

    /**
     * Login admin
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{success: boolean, data: {user, session}}>}
     */
    login: function(email, password) {
      return request('POST', '/api/auth', { email: email, password: password })
        .then(function(result) {
          if (result.success && result.data && result.data.session) {
            setCimentengSession(result.data.session);
          }
          return result;
        });
    },

    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn: function() {
      return !!getCimentengSession();
    },

    /**
     * Get current session
     * @returns {Object|null}
     */
    getSession: function() {
      return getCimentengSession();
    },

    /**
     * Logout
     */
    logout: function() {
      clearCimentengSession();
    },

    /**
     * Check API health
     * @returns {Promise<{ok: boolean}>}
     */
    healthCheck: function() {
      return request('GET', '/api/locations')
        .then(function() { return { ok: true }; })
        .catch(function() { return { ok: false }; });
    }
  };

  // Expose globally
  global.CimentengAPI = CimentengAPI;

})(typeof window !== 'undefined' ? window : this);
