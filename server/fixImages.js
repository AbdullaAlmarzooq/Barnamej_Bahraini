const Database = require('better-sqlite3');
const db = new Database('barnamej.db');

// Fix Al Fateh Grand Mosque image - use the correct filename with spaces and parentheses
db.exec(`UPDATE attractions SET image = 'http://localhost:3000/public/images/attractions/4/photo0jpg%20(1).jpg' WHERE id = 4;`);
console.log('✅ Fixed Al Fateh Grand Mosque image URL');

// For Lost Paradise, use the Screenshot as primary since no other image exists
db.exec(`UPDATE attractions SET image = 'http://localhost:3000/public/images/attractions/4/Screenshot%202025-11-23%20204601.png' WHERE id = 6;`);
console.log('✅ Set Lost Paradise to use available screenshot');

db.close();
