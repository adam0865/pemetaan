-- ============================================================
-- SQL Script: Update Category Icons
-- Peta Interaktif Desa Cimenteng
-- ============================================================
--
-- Gunakan script ini di Supabase SQL Editor untuk mengatur
-- icon Font Awesome yang sesuai untuk setiap kategori.
--
-- Tanggal: 10 Agustus 2026
-- Target: Tabel categories
--
-- ============================================================

-- Update icons untuk setiap kategori
UPDATE categories SET icon = 'fa-building', color = '#3b82f6' WHERE name = 'Pemerintahan';
UPDATE categories SET icon = 'fa-school', color = '#f59e0b' WHERE name = 'Pendidikan';
UPDATE categories SET icon = 'fa-hospital', color = '#ef4444' WHERE name = 'Kesehatan';
UPDATE categories SET icon = 'fa-mosque', color = '#10b981' WHERE name = 'Tempat Ibadah';
UPDATE categories SET icon = 'fa-store', color = '#8b5cf6' WHERE name = 'Fasilitas Umum';
UPDATE categories SET icon = 'fa-camera', color = '#06b6d4' WHERE name = 'Wisata';
UPDATE categories SET icon = 'fa-utensils', color = '#f97316' WHERE name = 'UMKM';
UPDATE categories SET icon = 'fa-map-pin', color = '#6b7280' WHERE name = 'Lainnya';

-- Verifikasi: Tampilkan semua kategori dengan icon
SELECT id, name, icon, color, created_at
FROM categories
ORDER BY name;

-- ============================================================
-- SELESAI
-- ============================================================
