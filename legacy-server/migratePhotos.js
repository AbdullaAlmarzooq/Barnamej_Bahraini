const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('barnamej.db');

console.log('🔄 Migrating existing photos to attraction_photos table...\n');

// Get all attractions with their current images
const attractions = db.prepare('SELECT id, name, image FROM attractions').all();

let migratedCount = 0;
let photosAdded = 0;

attractions.forEach(attraction => {
    console.log(`Processing: ${attraction.name} (ID: ${attraction.id})`);

    // Add the main image as primary photo
    if (attraction.image) {
        db.prepare(`
            INSERT INTO attraction_photos (attraction_id, url, is_primary, display_order)
            VALUES (?, ?, 1, 0)
        `).run(attraction.id, attraction.image);
        photosAdded++;
        console.log(`  ✓ Added primary photo from database`);
    }

    // Check for additional photos in the folder
    const photoDir = path.join(__dirname, 'public', 'images', 'attractions', attraction.id.toString());

    if (fs.existsSync(photoDir)) {
        const files = fs.readdirSync(photoDir);
        const imageFiles = files.filter(f =>
            f.match(/\.(jpg|jpeg|png|webp|gif)$/i)
        );

        let order = 1; // Start at 1 since primary is 0
        imageFiles.forEach(file => {
            const url = `http://192.168.100.38:3000/public/images/attractions/${attraction.id}/${file}`;

            // Skip if this is already the primary photo
            if (url === attraction.image) {
                return;
            }

            // Add as non-primary photo
            db.prepare(`
                INSERT INTO attraction_photos (attraction_id, url, is_primary, display_order)
                VALUES (?, ?, 0, ?)
            `).run(attraction.id, url, order);

            photosAdded++;
            order++;
            console.log(`  ✓ Added additional photo: ${file}`);
        });
    }

    migratedCount++;
    console.log('');
});

console.log('═'.repeat(50));
console.log(`✅ Migration complete!`);
console.log(`   Attractions processed: ${migratedCount}`);
console.log(`   Total photos added: ${photosAdded}`);
console.log('═'.repeat(50));

// Display summary
console.log('\nPhoto counts per attraction:');
const summary = db.prepare(`
    SELECT a.id, a.name, COUNT(ap.id) as photo_count,
           SUM(CASE WHEN ap.is_primary = 1 THEN 1 ELSE 0 END) as primary_count
    FROM attractions a
    LEFT JOIN attraction_photos ap ON a.id = ap.attraction_id
    GROUP BY a.id
    ORDER BY a.id
`).all();

summary.forEach(row => {
    console.log(`  ${row.id}. ${row.name}: ${row.photo_count} photos (${row.primary_count} primary)`);
});

db.close();
console.log('\n✨ Done!');
