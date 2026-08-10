-- ============================================================
-- SQL Script: Cleanup Data Test XSS
-- Peta Interaktif Desa Cimenteng
-- ============================================================
--
-- Gunakan script ini di Supabase SQL Editor untuk menghapus
-- semua data tempat yang merupakan hasil test XSS/penetration testing.
--
-- Tanggal: 10 Agustus 2026
-- Target: Tabel locations
--
-- ============================================================

-- Hapus data test XSS dari database
DELETE FROM locations 
WHERE name LIKE '%<script>%' 
   OR name LIKE '%onerror=%' 
   OR name LIKE '%javascript:%' 
   OR name LIKE '%DROP TABLE%'
   OR name LIKE '%alert(%'
   OR name LIKE '%fetch(%'
   OR name LIKE '%evil.com%'
   OR name LIKE '%steal%'
   OR photo_url LIKE '%evil.com%'
   OR photo_url LIKE '%steal%';

-- Verifikasi: Cek sisa data
SELECT id, name, category_id, latitude, longitude, google_maps_url, photo_url, created_at
FROM locations
WHERE name LIKE '%<script>%' 
   OR name LIKE '%onerror=%' 
   OR name LIKE '%javascript:%' 
   OR name LIKE '%DROP TABLE%'
   OR name LIKE '%alert(%'
   OR name LIKE '%fetch(%'
   OR name LIKE '%evil.com%'
   OR photo_url LIKE '%evil.com%';

-- Tampilkan jumlah baris yang tersisa
SELECT COUNT(*) as remaining_test_data
FROM locations
WHERE name LIKE '%<script>%' 
   OR name LIKE '%onerror=%' 
   OR name LIKE '%javascript:%' 
   OR name LIKE '%DROP TABLE%'
   OR photo_url LIKE '%evil.com%';

-- ============================================================
-- SELESAI
-- ============================================================
