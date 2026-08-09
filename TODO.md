# TODO - Peta Interaktif Desa Cimenteng

## Selesai
- [x] Definisikan area peta (bounds) inline di index.html
- [x] Hapus pencarian di header
- [x] Buat sidebar kontras (solid background rgba(8,14,28,0.93))
- [x] Tampilan map jelas (OpenStreetMap tile + polygon hijau)
- [x] Semua fitur tetap: header, sidebar (filter/stats/legend), map, zoom, layer, info panel, FAB, geolocation, theme toggle
- [x] Data load dari localStorage (admin panel) dengan fallback dummy
- [x] Responsif (sidebar max-width 90vw, info panel width min(600px,94vw))
- [x] Polygon area Cimenteng (bentuk natural 17 titik)
- [x] Rapikan struktur index.html agar markup tertutup rapi dan JS dipisah ke app.js/data.js
- [x] Tambahkan galeri foto mengambang di bawah peta dengan tombol "lihat semua foto" di slide terakhir
- [x] Admin panel mendukung beberapa foto per lokasi dan menyimpan koordinat lat/lng dari link Google Maps
- [x] Sesuaikan pusat dan garis desa Cimenteng mengikuti referensi Google Maps embed
- [x] Kosongkan data tempat bawaan dan bersihkan dummy lama dari localStorage
- [x] Sederhanakan admin: nama, kategori, link Google Maps, logo kategori, foto
- [x] Ubah tombol Google Maps di detail foto menjadi arahkan di dalam peta
- [x] Buat kontrol peta lebih kontras dan loading awal lebih lama

## Test
- [ ] Buka index.html -> peta muncul dengan marker + polygon
- [ ] Sidebar toggle buka/tutup
- [ ] Filter kategori bekerja
- [ ] Klik marker buka info panel
- [ ] Geolocation (Lokasi Saya)
- [ ] Layer ganti (OSM, Satelit, Topografi, Gelap)
- [ ] Zoom in/out & Kembali ke Cimenteng
- [ ] FAB terdekat/arahkan
- [ ] Tema toggle
- [ ] Admin panel (admin.html) -> input data -> map refresh
