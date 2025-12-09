import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
// Use legacy API to avoid deprecation warnings in Expo SDK 54+
import {
    getInfoAsync,
    makeDirectoryAsync,
    copyAsync,
    deleteAsync,
    readDirectoryAsync,
    readAsStringAsync,
    writeAsStringAsync,
    documentDirectory
} from 'expo-file-system/legacy';

const DB_NAME = 'barnamej_v2.db';
const DB_RESET_MARKER = 'db_version_marker.json';

// Set this to true during development if you need to wipe everything on every launch.
// In production, keep this FALSE.
const FORCE_RESET = false;

export class DatabaseClient {
    private static instance: DatabaseClient;
    private db: SQLite.SQLiteDatabase | null = null;
    private isInitializing = false;

    private constructor() { }

    public static getInstance(): DatabaseClient {
        if (!DatabaseClient.instance) {
            DatabaseClient.instance = new DatabaseClient();
        }
        return DatabaseClient.instance;
    }

    /**
     * Get the database instance. Initializes if not already open.
     */
    public async getDB(): Promise<SQLite.SQLiteDatabase> {
        if (this.db) {
            return this.db;
        }

        if (this.isInitializing) {
            // Wait for initialization
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.getDB();
        }

        this.isInitializing = true;

        try {
            // 1. Check if we need to reset/wipe old data to ensure fresh schema
            await this.resetDatabaseIfNeeded();

            // 2. Ensure the specific DB file exists (copy if missing)
            await this.ensureDatabaseReady();

            this.db = await SQLite.openDatabaseAsync(DB_NAME);

            // Strict configuration
            await this.db.execAsync(`
                PRAGMA journal_mode = WAL;
                PRAGMA foreign_keys = ON;
                PRAGMA journal_size_limit = 6144000;
                PRAGMA synchronous = NORMAL;
            `);

            console.log(`Database ${DB_NAME} initialized successfully`);
            return this.db;
        } catch (error) {
            console.error('Database initialization failed:', error);

            if (this.shouldRecoverFromError(error)) {
                console.warn('Corruption detected. Hard resetting...');
                await this.hardReset();
                return this.getDB();
            }

            throw error;
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Checks if a database reset is required based on version marker or force flag.
     * Deletes old files if needed.
     */
    private async resetDatabaseIfNeeded(): Promise<void> {
        const dbDir = documentDirectory + 'SQLite';
        const markerPath = `${dbDir}/${DB_RESET_MARKER}`;

        // Ensure directory exists first
        const dirInfo = await getInfoAsync(dbDir);
        if (!dirInfo.exists) {
            await makeDirectoryAsync(dbDir);
            return; // Directory is new, no reset needed (ensureDatabaseReady will handle copy)
        }

        let shouldReset = FORCE_RESET;

        if (!shouldReset) {
            // Check version marker
            const markerInfo = await getInfoAsync(markerPath);
            if (!markerInfo.exists) {
                console.log('No version marker found. Performing persistent cleanup...');
                shouldReset = true;
            } else {
                try {
                    const content = await readAsStringAsync(markerPath);
                    const data = JSON.parse(content);
                    if (data.minVersion !== DB_NAME) {
                        console.log(`Version mismatch (Found: ${data.minVersion}, Required: ${DB_NAME}). Resetting...`);
                        shouldReset = true;
                    }
                } catch (e) {
                    console.warn('Failed to read version marker. Resetting just in case...');
                    shouldReset = true;
                }
            }
        }

        if (shouldReset) {
            await this.performSafeWipe(dbDir);

            // Write new marker
            await writeAsStringAsync(markerPath, JSON.stringify({ minVersion: DB_NAME }));
            console.log('Database reset complete. New marker updated.');
        }
    }

    /**
     * Wipes all database files in the directory to clean stale cache (WAL/SHM etc).
     */
    private async performSafeWipe(dbDir: string) {
        console.log('Wiping all SQLite data...');
        try {
            const files = await readDirectoryAsync(dbDir);
            for (const file of files) {
                // Delete everything except the marker itself (though we overwrite marker anyway)
                // Primarily target .db, .db-shm, .db-wal
                if (file !== DB_RESET_MARKER || FORCE_RESET) {
                    await deleteAsync(`${dbDir}/${file}`, { idempotent: true });
                }
            }
        } catch (e) {
            console.error('Error during wipe:', e);
        }
    }

    /**
     * Helper for hard corruption recovery
     */
    private async hardReset() {
        const dbDir = documentDirectory + 'SQLite';
        await this.performSafeWipe(dbDir);
    }

    private async ensureDatabaseReady(): Promise<void> {
        const dbDir = documentDirectory + 'SQLite';
        const dbPath = `${dbDir}/${DB_NAME}`;

        // Double check directory because wipe might have been aggressive (though we iterate files currently)
        const dirInfo = await getInfoAsync(dbDir);
        if (!dirInfo.exists) {
            await makeDirectoryAsync(dbDir);
        }

        const fileInfo = await getInfoAsync(dbPath);

        if (!fileInfo.exists) {
            console.log(`Database file ${DB_NAME} missing. Copying from assets...`);
            await this.copyDatabaseFromAssets(dbPath);
        }
    }

    private async copyDatabaseFromAssets(targetPath: string) {
        try {
            // NOTE: Always requiring the base asset. 
            // In assets/ it is named 'barnamej.db' (or validation happens in asset loader).
            // We copy it to 'barnamej_vX.db'
            const asset = Asset.fromModule(require('../../assets/database/barnamej.db'));

            if (!asset.localUri) {
                await asset.downloadAsync();
            }

            if (asset.localUri) {
                await copyAsync({
                    from: asset.localUri,
                    to: targetPath,
                });
                console.log(`Database copied successfully to ${targetPath}`);
            } else {
                throw new Error("Asset localUri is null despite download");
            }

        } catch (error) {
            console.error('Failed to copy database from assets:', error);
            throw error;
        }
    }

    private shouldRecoverFromError(error: any): boolean {
        const msg = String(error);
        return msg.includes('corrupt') || msg.includes('malformed') || msg.includes('not a database');
    }
}

export const getDB = async () => DatabaseClient.getInstance().getDB();
