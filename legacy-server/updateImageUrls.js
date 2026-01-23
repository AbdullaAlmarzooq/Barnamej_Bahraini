const Database = require('better-sqlite3');

const db = new Database('barnamej.db');

// Update image URLs to point to local server
const updateSQL = `
UPDATE attractions SET image = CASE
    WHEN id = 1 THEN 'http://192.168.100.38:3000/public/images/attractions/1/Bahrain_Fort_March_2015.jpg'
    WHEN id = 2 THEN 'http://192.168.100.38:3000/public/images/attractions/2/240108-manama-souq-bab-al-bahrain-4k.jpg'
    WHEN id = 3 THEN 'http://192.168.100.38:3000/public/images/attractions/3/Screenshot 2025-11-23 204512.png'
    WHEN id = 4 THEN 'http://192.168.100.38:3000/public/images/attractions/4/Screenshot 2025-11-23 204601.png'
    WHEN id = 5 THEN 'http://192.168.100.38:3000/public/images/attractions/5/national-theatre-of-bahrain.jpg'
    ELSE image
END
WHERE id IN (1, 2, 3, 4, 5);
`;

db.exec(updateSQL);

console.log('✅ Database updated successfully!');
console.log('All attraction images now point to local server.');

// Verify the changes
const attractions = db.prepare('SELECT id, name, image FROM attractions').all();
console.log('\nCurrent image URLs:');
attractions.forEach(a => {
    console.log(`${a.id}. ${a.name}`);
    console.log(`   ${a.image}\n`);
});

db.close();
