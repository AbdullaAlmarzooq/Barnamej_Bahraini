const Database = require('better-sqlite3');
const db = new Database('barnamej.db');

// Update attractions to use localhost URLs
db.exec(`
    UPDATE attractions SET image = 'http://localhost:3000/public/images/attractions/1/Bahrain_Fort_March_2015.jpg' WHERE id = 1;
    UPDATE attractions SET image = 'http://localhost:3000/public/images/attractions/2/240108-manama-souq-bab-al-bahrain-4k.jpg' WHERE id = 2;
    UPDATE attractions SET image = 'http://localhost:3000/public/images/attractions/3/photo0jpg.jpg' WHERE id = 3;
    UPDATE attractions SET image = 'http://localhost:3000/public/images/attractions/4/photo0jpg_1.jpg' WHERE id = 4;
    UPDATE attractions SET image = 'http://localhost:3000/public/images/attractions/5/national-theatre-of-bahrain.jpg' WHERE id = 5;
    UPDATE attractions SET image = 'http://localhost:3000/public/images/attractions/6/lpod-water-park.jpg' WHERE id = 6;
`);

console.log('✅ Updated all attraction images to use local URLs');

// Also update attraction_photos table
db.exec(`
    UPDATE attraction_photos SET url = REPLACE(url, 'http://192.168.100.38:3000', 'http://localhost:3000');
`);

console.log('✅ Updated all photo URLs to use localhost');

db.close();
