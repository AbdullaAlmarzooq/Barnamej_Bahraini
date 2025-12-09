import { SQLiteDatabase } from 'expo-sqlite';

export const up = async (db: SQLiteDatabase) => {
    // FTS5 Virtual Table for full-text search on attractions
    // Contentless table (content='attractions') to save space, referencing the main table
    await db.execAsync(`
    CREATE VIRTUAL TABLE IF NOT EXISTS attractions_fts USING fts5(
        name, 
        description, 
        location, 
        content='attractions', 
        content_rowid='id'
    );
    
    -- Triggers to keep FTS index in sync with main table
    
    -- INSERT Trigger
    CREATE TRIGGER IF NOT EXISTS attractions_ai AFTER INSERT ON attractions BEGIN
      INSERT INTO attractions_fts(rowid, name, description, location) VALUES (new.id, new.name, new.description, new.location);
    END;
    
    -- DELETE Trigger
    CREATE TRIGGER IF NOT EXISTS attractions_ad AFTER DELETE ON attractions BEGIN
      INSERT INTO attractions_fts(attractions_fts, rowid, name, description, location) VALUES('delete', old.id, old.name, old.description, old.location);
    END;
    
    -- UPDATE Trigger
    CREATE TRIGGER IF NOT EXISTS attractions_au AFTER UPDATE ON attractions BEGIN
      INSERT INTO attractions_fts(attractions_fts, rowid, name, description, location) VALUES('delete', old.id, old.name, old.description, old.location);
      INSERT INTO attractions_fts(rowid, name, description, location) VALUES (new.id, new.name, new.description, new.location);
    END;
    
    -- Index existing data if any (Rebuild)
    INSERT INTO attractions_fts(attractions_fts) VALUES('rebuild');
  `);
};

export const down = async (db: SQLiteDatabase) => {
    await db.execAsync(`
    DROP TABLE IF EXISTS attractions_fts;
    DROP TRIGGER IF EXISTS attractions_ai;
    DROP TRIGGER IF EXISTS attractions_ad;
    DROP TRIGGER IF EXISTS attractions_au;
  `);
};
