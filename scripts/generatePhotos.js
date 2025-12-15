/**
 * generatePhotos.js
 * 
 * Reads attraction_photos from database and generates attractionPhotos.ts
 * Run: npm run sync-photos (from server folder)
 */

const fs = require('fs');
const path = require('path');
const Database = require('../server/node_modules/better-sqlite3');

const DB_PATH = path.join(__dirname, '../assets/database/Barnamej.db');
const PHOTOS_DIR = path.join(__dirname, '../assets/AttractionsPhotos');
const OUTPUT_FILE = path.join(__dirname, '../src/utils/attractionPhotos.ts');

function generatePhotosFile() {
    console.log('🔍 Reading photos from database...');

    const db = new Database(DB_PATH, { readonly: true });

    // Get all photos ordered by attraction_id, then is_primary DESC (primary first), then display_order
    const photos = db.prepare(`
        SELECT attraction_id, url 
        FROM attraction_photos 
        ORDER BY attraction_id, is_primary DESC, display_order ASC
    `).all();

    db.close();

    if (photos.length === 0) {
        console.error('❌ No photos found in database');
        process.exit(1);
    }

    // Group photos by attraction_id
    const photosByAttraction = {};
    for (const photo of photos) {
        if (!photosByAttraction[photo.attraction_id]) {
            photosByAttraction[photo.attraction_id] = [];
        }
        // Extract filename from URL (e.g., "http://localhost:3000/assets/AttractionsPhotos/1/photo.jpg" -> "photo.jpg")
        const urlParts = photo.url.split('/');
        const filename = urlParts[urlParts.length - 1];
        photosByAttraction[photo.attraction_id].push(filename);
    }

    const attractionIds = Object.keys(photosByAttraction).map(Number).sort((a, b) => a - b);
    console.log(`📁 Found ${attractionIds.length} attractions with photos`);

    // Build photo map entries
    const entries = [];

    for (const id of attractionIds) {
        const files = photosByAttraction[id];

        // Verify files exist on disk
        const validFiles = files.filter(file => {
            const filePath = path.join(PHOTOS_DIR, String(id), file);
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️  File not found: ${filePath}`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) {
            console.warn(`⚠️  No valid photos found for attraction ${id}`);
            continue;
        }

        console.log(`  📷 Attraction ${id}: ${validFiles.length} photos (primary first)`);

        const requires = validFiles.map(file =>
            `        require('../../assets/AttractionsPhotos/${id}/${file}')`
        ).join(',\n');

        entries.push(`    ${id}: [\n${requires},\n    ]`);
    }

    // Generate TypeScript file
    const content = `// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Run 'npm run sync-photos' in server folder to regenerate
// Photos are ordered: primary first, then by display_order
// Generated: ${new Date().toISOString()}

export const attractionPhotos: { [key: number]: any[] } = {
${entries.join(',\n')},
};

// Helper to get photos for an attraction
export const getPhotosForAttraction = (attractionId: number): any[] => {
    return attractionPhotos[attractionId] || [];
};

// Helper to get the first (primary) photo for list views
export const getFirstPhoto = (attractionId: number): any => {
    const photos = attractionPhotos[attractionId];
    return photos && photos.length > 0 ? photos[0] : null;
};
`;

    fs.writeFileSync(OUTPUT_FILE, content);
    console.log(`\n✅ Generated ${OUTPUT_FILE}`);
    console.log(`   ${attractionIds.length} attractions with photos (primary first)`);
}

generatePhotosFile();
