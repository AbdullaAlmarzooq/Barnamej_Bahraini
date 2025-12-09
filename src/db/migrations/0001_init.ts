import { SQLiteDatabase } from 'expo-sqlite';

export const up = async (db: SQLiteDatabase) => {
    await db.execAsync(`
    -- Attractions Table
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
    CREATE INDEX IF NOT EXISTS idx_attractions_name ON attractions(name);
    CREATE INDEX IF NOT EXISTS idx_attractions_category ON attractions(category);

    -- Reviews Table
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
    CREATE INDEX IF NOT EXISTS idx_reviews_attraction ON reviews(attraction_id);

    -- Itineraries Table
    CREATE TABLE IF NOT EXISTS itineraries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        is_public INTEGER DEFAULT 0,
        creator_name TEXT DEFAULT 'Me',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Itinerary Items Table
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
    CREATE INDEX IF NOT EXISTS idx_itinerary_items_itinerary ON itinerary_items(itinerary_id);

    -- Offline Sync Queue Table (Robust)
    CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,                 -- 'review', 'itinerary', etc.
        payload TEXT NOT NULL,              -- JSON string
        status TEXT DEFAULT 'pending',      -- 'pending', 'retry', 'failed'
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        priority INTEGER DEFAULT 1,         -- 1=Normal, 2=High
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_queue_status ON sync_queue(status);
  `);
};

export const down = async (db: SQLiteDatabase) => {
    await db.execAsync(`
    DROP TABLE IF EXISTS sync_queue;
    DROP TABLE IF EXISTS itinerary_items;
    DROP TABLE IF EXISTS itineraries;
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS attractions;
  `);
};
