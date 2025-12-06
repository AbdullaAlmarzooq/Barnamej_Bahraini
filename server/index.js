const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve static files (images) from public folder
app.use('/public', express.static('public'));
// Serve static files from project assets folder
const path = require('path');
app.use('/assets', express.static(path.join(__dirname, '../assets')));

const db = new Database('barnamej.db');

// Initialize Database
const initDatabase = () => {
    db.exec(`
    CREATE TABLE IF NOT EXISTS attractions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      location TEXT,
      image TEXT,
      rating REAL DEFAULT 0,
      price REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS attraction_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attraction_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attraction_id) REFERENCES attractions (id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attraction_id INTEGER,
      name TEXT,
      price_rating INTEGER,
      cleanliness_rating INTEGER,
      service_rating INTEGER,
      experience_rating INTEGER,
      comment TEXT,
      rating REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attraction_id) REFERENCES attractions (id)
    );
    CREATE TABLE IF NOT EXISTS itineraries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      is_public INTEGER DEFAULT 0,
      creator_name TEXT,
      total_price REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS itinerary_attractions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      itinerary_id INTEGER,
      attraction_id INTEGER,
      start_time TEXT,
      end_time TEXT,
      price REAL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries (id),
      FOREIGN KEY (attraction_id) REFERENCES attractions (id)
    );
  `);

    const count = db.prepare('SELECT count(*) as count FROM attractions').get();
    if (count.count === 0) {
        console.log('Seeding database...');
        const insert = db.prepare('INSERT INTO attractions (name, description, category, location, image, rating) VALUES (?, ?, ?, ?, ?, ?)');
        const attractions = [
            ['Qal\'at al-Bahrain', 'Ancient harbor and capital of Dilmun, a UNESCO World Heritage Site.', 'Historical', 'Karbabad', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Qal%27at_al-Bahrain_01.jpg/1200px-Qal%27at_al-Bahrain_01.jpg', 4.8],
            ['Bab Al Bahrain', 'Historical building located in the Customs Square in Manama.', 'Landmark', 'Manama', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Bab_Al_Bahrain.jpg/1200px-Bab_Al_Bahrain.jpg', 4.5],
            ['Tree of Life', 'A 400-year-old tree standing alone in the desert.', 'Nature', 'Desert', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Tree_of_Life%2C_Bahrain.jpg/1200px-Tree_of_Life%2C_Bahrain.jpg', 4.2],
            ['Al Fateh Grand Mosque', 'One of the largest mosques in the world, encompassing 6,500 square meters.', 'Religious', 'Juffair', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Al_Fateh_Grand_Mosque_Bahrain.jpg/1200px-Al_Fateh_Grand_Mosque_Bahrain.jpg', 4.9],
            ['Bahrain National Museum', 'The largest and one of the oldest public museums in Bahrain.', 'Museum', 'Manama', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Bahrain_National_Museum.jpg/1200px-Bahrain_National_Museum.jpg', 4.7]
        ];
        attractions.forEach(attr => insert.run(attr));
        console.log('Database seeded.');
    }
};

initDatabase();

// Helper functions
const convertItinerary = (itinerary) => ({
    ...itinerary,
    is_public: itinerary.is_public === 1 || itinerary.is_public === true,
    attraction_count: Number(itinerary.attraction_count || 0),
    total_price: Number(itinerary.total_price || 0)
});

const convertAttraction = (attraction) => ({
    ...attraction,
    rating: Number(attraction.rating || 0)
});

const convertItineraryAttraction = (attraction) => ({
    ...convertAttraction(attraction),
    price: Number(attraction.attr_price || 0)
});

// ============================================
// PUBLIC API ENDPOINTS
// ============================================

// Get all attractions
app.get('/attractions', (req, res) => {
    const stmt = db.prepare('SELECT * FROM attractions');
    const attractions = stmt.all();
    res.json(attractions.map(convertAttraction));
});

// Get featured attractions
app.get('/attractions/featured', (req, res) => {
    const stmt = db.prepare('SELECT * FROM attractions ORDER BY rating DESC LIMIT 3');
    const attractions = stmt.all();
    res.json(attractions.map(convertAttraction));
});

// Get attraction details
app.get('/attractions/:id', (req, res) => {
    const stmt = db.prepare('SELECT * FROM attractions WHERE id = ?');
    const attraction = stmt.get(req.params.id);
    res.json(attraction ? convertAttraction(attraction) : null);
});

// Get all nationalities
app.get('/nationalities', (req, res) => {
    const nationalities = db.prepare('SELECT * FROM nationalities ORDER BY name').all();
    res.json(nationalities);
});

// Get reviews for attraction
app.get('/attractions/:id/reviews', (req, res) => {
    const stmt = db.prepare(`
        SELECT r.*, n.name as nationality 
        FROM reviews r 
        LEFT JOIN nationalities n ON r.nationality_id = n.id
        WHERE r.attraction_id = ? 
        ORDER BY r.created_at DESC
    `);
    const reviews = stmt.all(req.params.id);
    res.json(reviews);
});

// Add review
app.post('/reviews', (req, res) => {
    const { attraction_id, name, price_rating, cleanliness_rating, service_rating, experience_rating, comment, age, nationality_id } = req.body;

    // Calculate simple average for the review itself if needed, or just insert raw
    const reviewRating = (price_rating + cleanliness_rating + service_rating + experience_rating) / 4;

    const insert = db.prepare(`
        INSERT INTO reviews (
            attraction_id, name, price_rating, cleanliness_rating, service_rating, experience_rating, comment, rating, age, nationality_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
        attraction_id, name, price_rating, cleanliness_rating, service_rating, experience_rating,
        comment, reviewRating, age || null, nationality_id || null
    );

    // Update average rating for attraction
    const reviews = db.prepare('SELECT * FROM reviews WHERE attraction_id = ?').all(attraction_id);
    let totalRating = 0;
    reviews.forEach(r => {
        totalRating += (r.price_rating + r.cleanliness_rating + r.service_rating + r.experience_rating) / 4;
    });
    const newAvg = totalRating / reviews.length;
    db.prepare('UPDATE attractions SET rating = ? WHERE id = ?').run(newAvg, attraction_id);

    res.json({ success: true });
});

// Get Itineraries (My vs Public vs All)
app.get('/itineraries', (req, res) => {
    let query = `
        SELECT i.*, COUNT(ia.id) as attraction_count 
        FROM itineraries i 
        LEFT JOIN itinerary_attractions ia ON i.id = ia.itinerary_id 
    `;

    const params = [];

    if (req.query.public !== 'all') {
        query += ' WHERE i.is_public = ?';
        params.push(req.query.public === 'true' ? 1 : 0);
    }

    query += ' GROUP BY i.id ORDER BY i.created_at DESC';

    const stmt = db.prepare(query);
    const itineraries = stmt.all(...params);
    res.json(itineraries.map(convertItinerary));
});

// Create Itinerary
app.post('/itineraries', (req, res) => {
    const { name, description, is_public, creator_name } = req.body;
    const insert = db.prepare('INSERT INTO itineraries (name, description, is_public, creator_name) VALUES (?, ?, ?, ?)');
    const result = insert.run(name, description, is_public ? 1 : 0, creator_name);
    res.json({ id: result.lastInsertRowid });
});

// Get Itinerary Details
app.get('/itineraries/:id', (req, res) => {
    const itinerary = db.prepare('SELECT * FROM itineraries WHERE id = ?').get(req.params.id);
    if (!itinerary) return res.status(404).json({ error: 'Not found' });

    const attractions = db.prepare(`
    SELECT 
        a.id, a.name, a.description, a.category, a.location, a.image, a.rating, a.price as attr_price,
        ia.id as link_id, ia.start_time, ia.end_time, ia.notes 
    FROM attractions a 
    JOIN itinerary_attractions ia ON a.id = ia.attraction_id 
    WHERE ia.itinerary_id = ?
  `).all(req.params.id);

    res.json({ ...convertItinerary(itinerary), attractions: attractions.map(convertItineraryAttraction) });
});

// Add to Itinerary
app.post('/itineraries/:id/attractions', (req, res) => {
    const { attraction_id } = req.body;
    const insert = db.prepare('INSERT INTO itinerary_attractions (itinerary_id, attraction_id) VALUES (?, ?)');
    insert.run(req.params.id, attraction_id);

    // Recalculate total
    const result = db.prepare(`
        SELECT SUM(a.price) as total 
        FROM itinerary_attractions ia 
        JOIN attractions a ON ia.attraction_id = a.id 
        WHERE ia.itinerary_id = ?
    `).get(req.params.id);

    console.log('DEBUG: Recalculating total for Itinerary ID:', req.params.id);
    console.log('DEBUG: Logic Query Result:', JSON.stringify(result));

    db.prepare('UPDATE itineraries SET total_price = ? WHERE id = ?').run(result.total || 0, req.params.id);

    res.json({ success: true });
});

// Update Itinerary Attraction Details
app.put('/itineraries/attractions/:id', (req, res) => {
    const { start_time, end_time, price, notes } = req.body;

    // Dynamic update query construction
    const updates = [];
    const values = [];

    if (start_time !== undefined) {
        updates.push('start_time = ?');
        values.push(start_time);
    }
    if (end_time !== undefined) {
        updates.push('end_time = ?');
        values.push(end_time);
    }
    if (price !== undefined) {
        updates.push('price = ?');
        values.push(price);
    }
    if (notes !== undefined) {
        updates.push('notes = ?');
        values.push(notes);
    }

    if (updates.length > 0) {
        values.push(req.params.id);
        const query = `UPDATE itinerary_attractions SET ${updates.join(', ')} WHERE id = ?`;
        db.prepare(query).run(...values);
    }

    // Recalculate total if needed (though price shouldn't change via this endpoint anymore)
    // We'll keep it simple and just return success, assuming price is not editable here.

    res.json({ success: true });
});

// Remove from Itinerary
app.delete('/itineraries/:id/attractions/:attractionId', (req, res) => {
    db.prepare('DELETE FROM itinerary_attractions WHERE itinerary_id = ? AND attraction_id = ?').run(req.params.id, req.params.attractionId);

    // Recalculate total
    // Recalculate total
    const result = db.prepare(`
        SELECT SUM(a.price) as total 
        FROM itinerary_attractions ia 
        JOIN attractions a ON ia.attraction_id = a.id 
        WHERE ia.itinerary_id = ?
    `).get(req.params.id);

    db.prepare('UPDATE itineraries SET total_price = ? WHERE id = ?').run(result.total || 0, req.params.id);

    res.json({ success: true });
});

// Delete Itinerary
app.delete('/itineraries/:id', (req, res) => {
    db.prepare('DELETE FROM itinerary_attractions WHERE itinerary_id = ?').run(req.params.id);
    db.prepare('DELETE FROM itineraries WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// ============================================
// ADMIN API ENDPOINTS
// ============================================

// Get all reviews (admin)
// Get all reviews (admin)
app.get('/api/admin/reviews', (req, res) => {
    const reviews = db.prepare(`
        SELECT r.*, a.name as attraction_name, n.name as nationality 
        FROM reviews r
        LEFT JOIN attractions a ON r.attraction_id = a.id
        LEFT JOIN nationalities n ON r.nationality_id = n.id
        ORDER BY r.created_at DESC
    `).all();
    res.json(reviews);
});

// Delete review (admin)
app.delete('/api/admin/reviews/:id', (req, res) => {
    db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// Create attraction (admin)
app.post('/api/admin/attractions', (req, res) => {
    try {
        console.log('=== CREATE ATTRACTION REQUEST ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        const { name, description, category, location, image, rating, price } = req.body;

        console.log('Extracted values:');
        console.log('- name:', name, typeof name);
        console.log('- description:', description, typeof description);
        console.log('- category:', category, typeof category);
        console.log('- location:', location, typeof location);
        console.log('- image:', image, typeof image);
        console.log('- rating:', rating, typeof rating);
        console.log('- price:', price, typeof price);

        const insert = db.prepare('INSERT INTO attractions (name, description, category, location, image, rating, price) VALUES (?, ?, ?, ?, ?, ?, ?)');
        const result = insert.run(name, description, category, location, image, rating || 0, price || 0);

        console.log('SUCCESS! Created attraction with ID:', result.lastInsertRowid);
        res.json({ id: result.lastInsertRowid });
    } catch (err) {
        console.error('=== ERROR CREATING ATTRACTION ===');
        console.error('Error message:', err.message);
        console.error('Error code:', err.code);
        console.error('Full error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update attraction (admin)
app.put('/api/admin/attractions/:id', (req, res) => {
    const { name, description, category, location, image, rating, price } = req.body;
    db.prepare('UPDATE attractions SET name = ?, description = ?, category = ?, location = ?, image = ?, rating = ?, price = ? WHERE id = ?')
        .run(name, description, category, location, image, rating, price, req.params.id);
    res.json({ success: true });
});

// Delete attraction (admin)
app.delete('/api/admin/attractions/:id', (req, res) => {
    db.prepare('DELETE FROM reviews WHERE attraction_id = ?').run(req.params.id);
    db.prepare('DELETE FROM itinerary_attractions WHERE attraction_id = ?').run(req.params.id);
    db.prepare('DELETE FROM attractions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// Update itinerary (admin)
app.put('/api/admin/itineraries/:id', (req, res) => {
    const { name, description, is_public } = req.body;
    const updates = [];
    const values = [];

    if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
    }
    if (is_public !== undefined) {
        updates.push('is_public = ?');
        values.push(is_public ? 1 : 0);
    }

    if (updates.length > 0) {
        values.push(req.params.id);
        db.prepare(`UPDATE itineraries SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    res.json({ success: true });
});

// Get statistics (admin)
app.get('/api/admin/statistics', (req, res) => {
    const totalAttractions = db.prepare('SELECT COUNT(*) as count FROM attractions').get();
    const totalReviews = db.prepare('SELECT COUNT(*) as count FROM reviews').get();
    const totalItineraries = db.prepare('SELECT COUNT(*) as count FROM itineraries').get();
    const avgRating = db.prepare('SELECT AVG(rating) as avg FROM attractions').get();

    res.json({
        total_attractions: totalAttractions.count,
        total_reviews: totalReviews.count,
        total_itineraries: totalItineraries.count,
        average_rating: avgRating.avg || 0
    });
});

// ==================== Photo Management Endpoints ====================

// Get all photos for an attraction
app.get('/api/admin/attractions/:id/photos', (req, res) => {
    const { id } = req.params;
    const photos = db.prepare(`
        SELECT * FROM attraction_photos 
        WHERE attraction_id = ? 
        ORDER BY is_primary DESC, display_order ASC
    `).all(id);
    res.json(photos);
});

// Add a new photo to an attraction
app.post('/api/admin/attractions/:id/photos', (req, res) => {
    const { id } = req.params;
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const maxOrder = db.prepare(`
        SELECT MAX(display_order) as max_order 
        FROM attraction_photos 
        WHERE attraction_id = ?
    `).get(id);

    const nextOrder = (maxOrder?.max_order || 0) + 1;

    const result = db.prepare(`
        INSERT INTO attraction_photos (attraction_id, url, is_primary, display_order)
        VALUES (?, ?, 0, ?)
    `).run(id, url, nextOrder);

    const newPhoto = db.prepare('SELECT * FROM attraction_photos WHERE id = ?').get(result.lastInsertRowid);
    res.json(newPhoto);
});

// Delete a photo
app.delete('/api/admin/photos/:photoId', (req, res) => {
    const { photoId } = req.params;

    const photo = db.prepare('SELECT * FROM attraction_photos WHERE id = ?').get(photoId);

    if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
    }

    const photoCount = db.prepare(`
        SELECT COUNT(*) as count 
        FROM attraction_photos 
        WHERE attraction_id = ?
    `).get(photo.attraction_id);

    if (photoCount.count <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last photo' });
    }

    if (photo.is_primary === 1) {
        const newPrimary = db.prepare(`
            SELECT id, url FROM attraction_photos 
            WHERE attraction_id = ? AND id != ? 
            ORDER BY display_order ASC 
            LIMIT 1
        `).get(photo.attraction_id, photoId);

        if (newPrimary) {
            db.prepare('UPDATE attraction_photos SET is_primary = 1 WHERE id = ?').run(newPrimary.id);
            db.prepare('UPDATE attractions SET image = ? WHERE id = ?').run(newPrimary.url, photo.attraction_id);
        }
    }

    const result = db.prepare('DELETE FROM attraction_photos WHERE id = ?').run(photoId);
    res.json({ success: result.changes > 0 });
});

// Set a photo as primary
app.put('/api/admin/photos/:photoId/set-primary', (req, res) => {
    const { photoId } = req.params;

    const photo = db.prepare('SELECT * FROM attraction_photos WHERE id = ?').get(photoId);

    if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
    }

    db.prepare('UPDATE attraction_photos SET is_primary = 0 WHERE attraction_id = ?').run(photo.attraction_id);
    db.prepare('UPDATE attraction_photos SET is_primary = 1 WHERE id = ?').run(photoId);
    db.prepare('UPDATE attractions SET image = ? WHERE id = ?').run(photo.url, photo.attraction_id);

    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📷 Photo Management API ready!`);
});
