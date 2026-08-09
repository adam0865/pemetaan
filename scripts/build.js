const fs = require('fs');
const path = require('path');

// Files to copy to public directory
const files = [
  'index.html',
  'admin.html',
  'login.html',
  'tambah.html',
  'api.js',
  'app.js',
  'data.js',
  'styles.css',
  'favicon.svg',
  'Desa_Cimenteng.geojson',
  'Desa_Cimenteng.kml'
];

const publicDir = path.join(__dirname, '..', 'public');

// Create public directory
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy files
let copied = 0;
files.forEach(file => {
  const src = path.join(__dirname, '..', file);
  const dest = path.join(publicDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    copied++;
  }
});

console.log(`Copied ${copied} files to public/`);

// Copy api/ folder
const apiSrc = path.join(__dirname, '..', 'api');
const apiDest = path.join(publicDir, 'api');
if (fs.existsSync(apiSrc)) {
  if (!fs.existsSync(apiDest)) {
    fs.mkdirSync(apiDest, { recursive: true });
  }
  const apiFiles = fs.readdirSync(apiSrc);
  apiFiles.forEach(file => {
    if (file.endsWith('.js')) {
      fs.copyFileSync(path.join(apiSrc, file), path.join(apiDest, file));
      copied++;
    }
  });
  console.log(`Copied api/ folder (${apiFiles.filter(f => f.endsWith('.js')).length} files)`);
}

console.log(`Total: ${copied} files copied to public/`);
