const Database = require('better-sqlite3');
const db = new Database('barnamej.db');

console.log('🔄 Switching photo storage to local assets...');

// Update attractions table
db.exec(`
    UPDATE attractions 
    SET image = REPLACE(image, 'http://localhost:3000/public/images/attractions/', 'http://localhost:3000/assets/AttractionsPhotos/')
    WHERE image LIKE 'http://localhost:3000/public/images/attractions/%';
`);

// Update attraction_photos table
db.exec(`
    UPDATE attraction_photos 
    SET url = REPLACE(url, 'http://localhost:3000/public/images/attractions/', 'http://localhost:3000/assets/AttractionsPhotos/')
    WHERE url LIKE 'http://localhost:3000/public/images/attractions/%';
`);

// Also handle the old IP address if any remain
db.exec(`
    UPDATE attractions 
    SET image = REPLACE(image, 'http://192.168.100.38:3000/public/images/attractions/', 'http://localhost:3000/assets/AttractionsPhotos/')
    WHERE image LIKE 'http://192.168.100.38:3000/public/images/attractions/%';
`);

db.exec(`
    UPDATE attraction_photos 
    SET url = REPLACE(url, 'http://192.168.100.38:3000/public/images/attractions/', 'http://localhost:3000/assets/AttractionsPhotos/')
    WHERE url LIKE 'http://192.168.100.38:3000/public/images/attractions/%';
`);

console.log('✅ Database updated to use /assets/AttractionsPhotos/ paths');

// Verify a few records
const attractions = db.prepare('SELECT id, name, image FROM attractions LIMIT 3').all();
console.log('Sample attractions:', attractions);

db.close();
