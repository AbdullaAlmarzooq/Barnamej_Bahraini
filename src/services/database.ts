import * as SQLite from 'expo-sqlite';
import { postReview as apiPostReview, postItinerary as apiPostItinerary } from './api';

let db: SQLite.SQLiteDatabase;

const DB_VERSION = 3; // Increment this when schema changes

export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync('barnamej.db');

    // Check database version
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY
      );
    `);

    const versionResult = await db.getFirstAsync<{ version: number }>('SELECT version FROM db_version LIMIT 1');
    const currentVersion = versionResult?.version || 0;

    if (currentVersion < DB_VERSION) {
      console.log(`Database version mismatch. Current: ${currentVersion}, Required: ${DB_VERSION}. Recreating database...`);

      // Drop all existing tables
      await db.execAsync(`
        DROP TABLE IF EXISTS attraction_photos;
        DROP TABLE IF EXISTS itinerary_items;
        DROP TABLE IF EXISTS itineraries;
        DROP TABLE IF EXISTS reviews;
        DROP TABLE IF EXISTS attractions;
        DROP TABLE IF EXISTS db_version;
      `);
    }

    // Create version table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY
      );
    `);

    // Create tables
    await db.execAsync(`
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS attractions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                image TEXT NOT NULL,
                location TEXT NOT NULL,
                description TEXT NOT NULL,
                rating REAL DEFAULT 0,
                price REAL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                attraction_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                comment TEXT NOT NULL,
                rating REAL NOT NULL,
                price_rating REAL DEFAULT 0,
                cleanliness_rating REAL DEFAULT 0,
                service_rating REAL DEFAULT 0,
                experience_rating REAL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (attraction_id) REFERENCES attractions (id)
            );

            CREATE TABLE IF NOT EXISTS itineraries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                is_public INTEGER DEFAULT 0,
                creator_name TEXT DEFAULT 'Me',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS itinerary_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                itinerary_id INTEGER NOT NULL,
                attraction_id INTEGER NOT NULL,
                start_time TEXT,
                end_time TEXT,
                price REAL DEFAULT 0,
                notes TEXT,
                FOREIGN KEY (itinerary_id) REFERENCES itineraries (id) ON DELETE CASCADE,
                FOREIGN KEY (attraction_id) REFERENCES attractions (id)
            );
        `);

    // Update version
    await db.runAsync('DELETE FROM db_version');
    await db.runAsync('INSERT INTO db_version (version) VALUES (?)', [DB_VERSION]);

    // Seed data if empty
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM attractions');
    if (result && result.count === 0) {
      console.log('Seeding database...');
      await seedDatabase();
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
};

const seedDatabase = async () => {
  // Import attractions from JSON file  (exported from server/barnamej.db)
  const attractionsData = require('../data/attractions.json');

  for (const a of attractionsData) {
    await db.runAsync(
      'INSERT INTO attractions (name, category, image, location, description, rating, price) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [a.name, a.category, a.image, a.location, a.description, a.rating, a.price || 0]
    );
  }

  console.log(`Seeded ${attractionsData.length} attractions from JSON file`);
};

// Service Functions

export const getAllAttractions = async () => {
  return await db.getAllAsync('SELECT * FROM attractions');
};

export const getFeaturedAttractions = async () => {
  return await db.getAllAsync('SELECT * FROM attractions ORDER BY rating DESC LIMIT 5');
};

export const getAttractionById = async (id: number) => {
  const attraction = await db.getFirstAsync<any>('SELECT * FROM attractions WHERE id = ?', [id]);
  return attraction;
};

export const addReview = async (review: any) => {
  const { attraction_id, name, comment, price_rating, cleanliness_rating, service_rating, experience_rating } = review;
  const rating = (price_rating + cleanliness_rating + service_rating + experience_rating) / 4;

  // STEP 1: Save locally first (offline-first approach)
  await db.runAsync(
    `INSERT INTO reviews (attraction_id, name, comment, rating, price_rating, cleanliness_rating, service_rating, experience_rating) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [attraction_id, name, comment, rating, price_rating, cleanliness_rating, service_rating, experience_rating]
  );

  // Update attraction average rating locally
  const result = await db.getFirstAsync<{ avg_rating: number }>('SELECT AVG(rating) as avg_rating FROM reviews WHERE attraction_id = ?', [attraction_id]);
  if (result) {
    await db.runAsync('UPDATE attractions SET rating = ? WHERE id = ?', [result.avg_rating, attraction_id]);
  }

  // STEP 2: Try to sync to backend when online (don't block on this)
  apiPostReview({ attraction_id, name, comment, rating, price_rating, cleanliness_rating, service_rating, experience_rating })
    .then(response => {
      if (response.success) {
        console.log('Review synced to server successfully');
      } else {
        console.log('Review saved locally, will sync later:', response.error);
      }
    })
    .catch(error => console.error('Failed to sync review:', error));

  return { success: true };
};

export const getReviewsForAttraction = async (attractionId: number) => {
  return await db.getAllAsync('SELECT * FROM reviews WHERE attraction_id = ? ORDER BY created_at DESC', [attractionId]);
};

export const createItinerary = async (name: string, description: string = '', isPublic: boolean = false, creatorName: string = 'Me') => {
  try {
    // STEP 1: Save locally first
    console.log('Creating itinerary locally:', { name, description, isPublic, creatorName });
    const result = await db.runAsync(
      'INSERT INTO itineraries (name, description, is_public, creator_name) VALUES (?, ?, ?, ?)',
      [name, description, isPublic ? 1 : 0, creatorName]
    );

    const itineraryId = result.lastInsertRowId;
    console.log('Itinerary created locally with ID:', itineraryId);

    // STEP 2: Try to sync to backend when online
    apiPostItinerary({ name, description, is_public: isPublic, creator_name: creatorName })
      .then(response => {
        if (response.success) {
          console.log('Itinerary synced to server successfully');
        } else {
          console.log('Itinerary saved locally, will sync later:', response.error);
        }
      })
      .catch(error => console.error('Failed to sync itinerary:', error));

    return { id: itineraryId };
  } catch (error) {
    console.error('Failed to create itinerary locally:', error);
    throw error;
  }
};

export const getItineraries = async () => {
  // Show ALL user's itineraries (both public and private)
  const itineraries = await db.getAllAsync<any>('SELECT * FROM itineraries ORDER BY created_at DESC');
  console.log(`Fetched ${itineraries.length} itineraries from local database`);

  // Get attraction count and total price for each
  for (let it of itineraries) {
    const stats = await db.getFirstAsync<{ count: number, total: number }>(
      'SELECT COUNT(*) as count, SUM(price) as total FROM itinerary_items WHERE itinerary_id = ?',
      [it.id]
    );
    it.attraction_count = stats?.count || 0;
    it.total_price = stats?.total || 0;
  }

  return itineraries;
};

export const getPublicItineraries = async () => {
  const itineraries = await db.getAllAsync<any>('SELECT * FROM itineraries WHERE is_public = 1 ORDER BY created_at DESC');

  for (let it of itineraries) {
    const stats = await db.getFirstAsync<{ count: number, total: number }>(
      'SELECT COUNT(*) as count, SUM(price) as total FROM itinerary_items WHERE itinerary_id = ?',
      [it.id]
    );
    it.attraction_count = stats?.count || 0;
    it.total_price = stats?.total || 0;
  }

  return itineraries;
};

export const getItineraryDetails = async (id: number) => {
  console.log('getItineraryDetails called for ID:', id);
  const itinerary = await db.getFirstAsync<any>('SELECT * FROM itineraries WHERE id = ?', [id]);

  if (!itinerary) {
    console.log('Itinerary not found for ID:', id);
    return null;
  }

  console.log('Found itinerary:', itinerary.name);

  const items = await db.getAllAsync<any>(`
        SELECT 
          i.id as link_id,
          i.start_time, 
          i.end_time, 
          i.price, 
          i.notes,
          a.id,
          a.name, 
          a.image, 
          a.category 
        FROM itinerary_items i 
        JOIN attractions a ON i.attraction_id = a.id 
        WHERE i.itinerary_id = ?
    `, [id]);

  console.log('Found', items.length, 'attractions in itinerary');
  itinerary.attractions = items;

  const stats = await db.getFirstAsync<{ total: number }>(
    'SELECT SUM(price) as total FROM itinerary_items WHERE itinerary_id = ?',
    [id]
  );
  itinerary.total_price = stats?.total || 0;

  return itinerary;
};

export const addToItinerary = async (itineraryId: number, attractionId: number) => {
  await db.runAsync(
    'INSERT INTO itinerary_items (itinerary_id, attraction_id) VALUES (?, ?)',
    [itineraryId, attractionId]
  );
  return { success: true };
};

export const updateItineraryAttraction = async (linkId: number, startTime: string, endTime: string, price: number, notes: string) => {
  await db.runAsync(
    'UPDATE itinerary_items SET start_time = ?, end_time = ?, price = ?, notes = ? WHERE id = ?',
    [startTime, endTime, price, notes, linkId]
  );
  return { success: true };
};

export const removeFromItinerary = async (itineraryId: number, attractionId: number) => {
  // Note: The UI passes attractionId, but we might need the link ID (itinerary_items.id) if duplicates are allowed.
  // For now assuming we remove by attraction_id for that itinerary.
  await db.runAsync(
    'DELETE FROM itinerary_items WHERE itinerary_id = ? AND attraction_id = ?',
    [itineraryId, attractionId]
  );
  return { success: true };
};

export const deleteItinerary = async (itineraryId: number) => {
  await db.runAsync('DELETE FROM itineraries WHERE id = ?', [itineraryId]);
  return { success: true };
};
