import { SQLiteDatabase } from 'expo-sqlite';
import { runTransaction } from './utils/execute';

const LATEST_SCHEMA_VERSION = 4;

export interface Migration {
    up: (db: SQLiteDatabase) => Promise<void>;
    down: (db: SQLiteDatabase) => Promise<void>;
}

// Registry of all migrations
const MIGRATIONS: Record<string, Migration> = {
    '0001_init': require('./migrations/0001_init'),
    '0002_add_search_index': require('./migrations/0002_add_search_index'),
    '0003_fix_itinerary_table': require('./migrations/0003_fix_itinerary_table'),
    '0004_add_sorting': require('./migrations/0004_add_sorting'),
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
        // 1. Ensure migrations and schema_meta tables exist
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        checksum TEXT,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS schema_meta (
        version INTEGER
      );
    `);

        // Get current schema version
        const versionResult = await db.getFirstAsync<{ version: number }>('SELECT version FROM schema_meta');
        let currentVersion = versionResult?.version || 0;

        // Initialize version if it doesn't exist (assuming 0 for fresh starts or existing non-versioned Dbs)
        if (!versionResult) {
            await db.runAsync('INSERT INTO schema_meta (version) VALUES (?)', [0]);
        }


        // 2. Get executed migrations
        const executed = await db.getAllAsync<{ name: string, checksum: string }>('SELECT name, checksum FROM migrations');
        const executedMap = new Map(executed.map(m => [m.name, m.checksum]));

        // 3. Run pending migrations
        const sortedKeys = Object.keys(MIGRATIONS).sort();

        for (const key of sortedKeys) {
            // SPECIAL HANDLING FOR 0004: Schema Version Check
            if (key === '0004_add_sorting') {
                if (currentVersion >= 4) {
                    console.log(`Skipping migration ${key} (Schema Version ${currentVersion} >= 4)`);
                    continue;
                }
            }
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

                // Update schema version if this was the sorting migration
                if (key === '0004_add_sorting') {
                    await db.runAsync('UPDATE schema_meta SET version = ?', [4]);
                    currentVersion = 4;
                }
            });

            console.log(`Migration ${key} completed`);
        }

        console.log('All migrations up to date');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
};
