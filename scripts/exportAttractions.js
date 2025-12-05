const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Path to the server database
const DB_PATH = path.join(__dirname, '../server/barnamej.db');
const OUTPUT_PATH = path.join(__dirname, '../src/data/attractions.json');

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Open database
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to server/barnamej.db');
});

// Export attractions
db.all('SELECT * FROM attractions', [], (err, rows) => {
    if (err) {
        console.error('Error reading attractions:', err.message);
        process.exit(1);
    }

    console.log(`Found ${rows.length} attractions`);

    // Write to JSON file
    const jsonData = JSON.stringify(rows, null, 2);
    fs.writeFileSync(OUTPUT_PATH, jsonData, 'utf8');

    console.log(`✓ Exported ${rows.length} attractions to ${OUTPUT_PATH}`);

    // Display sample data
    if (rows.length > 0) {
        console.log('\nSample attraction:');
        console.log(rows[0]);
    }

    db.close();
});
