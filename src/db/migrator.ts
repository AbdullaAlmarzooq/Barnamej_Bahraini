import { SQLiteDatabase } from 'expo-sqlite';
import { runTransaction } from './utils/execute';

export interface Migration {
    up: (db: SQLiteDatabase) => Promise<void>;
    down: (db: SQLiteDatabase) => Promise<void>;
}

// Registry of all migrations
const MIGRATIONS: Record<string, Migration> = {
    '0001_init': require('./migrations/0001_init'),
    '0002_add_search_index': require('./migrations/0002_add_search_index'),
};

// Simple hash function for checksums (in real app, use crypto)
const computeChecksum = (content: string): string => {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
};

export const runMigrations = async (db: SQLiteDatabase) => {
    try {
        // 1. Ensure migrations table exists
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        checksum TEXT,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 2. Get executed migrations
        const executed = await db.getAllAsync<{ name: string, checksum: string }>('SELECT name, checksum FROM migrations');
        const executedMap = new Map(executed.map(m => [m.name, m.checksum]));

        // 3. Run pending migrations
        const sortedKeys = Object.keys(MIGRATIONS).sort();

        for (const key of sortedKeys) {
            // Calculate checksum of the migration logic (just using strict name mapping for now as proxy for content identity in this environment without reading file content easily)
            // In a strict environment, we'd read the file content. 
            // For this implementation, we will use a computed hash of the key + simple string to simulate checks, 
            // or if we can read the module exports to string. 
            // Let's rely on the module structure.

            const migrationModule = MIGRATIONS[key];
            const checksum = computeChecksum(migrationModule.up.toString());

            if (executedMap.has(key)) {
                const existingChecksum = executedMap.get(key);
                if (existingChecksum && existingChecksum !== checksum) {
                    console.warn(`[Migration] Checksum mismatch for ${key}. Expected ${checksum}, found ${existingChecksum}. Migration code has changed!`);
                    // In strict mode, throw error. For now, warn.
                }
                continue;
            }

            console.log(`Running migration: ${key}`);

            await runTransaction(db, async () => {
                await migrationModule.up(db);
                await db.runAsync('INSERT INTO migrations (name, checksum) VALUES (?, ?)', [key, checksum]);
            });

            console.log(`Migration ${key} completed`);
        }

        console.log('All migrations up to date');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
};
