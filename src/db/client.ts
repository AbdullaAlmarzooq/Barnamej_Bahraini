import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
// Use legacy API to avoid deprecation warnings in Expo SDK 54+
import {
    getInfoAsync,
    makeDirectoryAsync,
    copyAsync,
    deleteAsync,
    readDirectoryAsync,
    documentDirectory
} from 'expo-file-system/legacy';

const DB_NAME = 'barnamej_v2.db';

// In DEVELOPMENT mode (__DEV__ = true): Always reset database on launch
// This ensures you always get the fresh bundled database after running sync-photos
// In PRODUCTION mode (__DEV__ = false): Never auto-reset, preserve user data
declare const __DEV__: boolean;
const DEV_FORCE_DB_RESET = __DEV__ === true;

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
     * In development mode, always reset the database to get fresh data from bundled assets.
     * In production, only reset if the database file doesn't exist.
     */
    private async resetDatabaseIfNeeded(): Promise<void> {
        const dbDir = documentDirectory + 'SQLite';

        // Ensure directory exists first
        const dirInfo = await getInfoAsync(dbDir);
        if (!dirInfo.exists) {
            await makeDirectoryAsync(dbDir);
            return; // Directory is new, no reset needed (ensureDatabaseReady will handle copy)
        }

        // In development mode, always delete existing database to get fresh bundled data
        if (DEV_FORCE_DB_RESET) {
            console.warn('⚠️ DEV: Forcing SQLite database reset for fresh data');
            await this.deleteDatabaseFiles(dbDir);
        }
    }

    /**
     * Deletes all SQLite database files including WAL and SHM files.
     */
    private async deleteDatabaseFiles(dbDir: string): Promise<void> {
        const dbPath = `${dbDir}/${DB_NAME}`;
        const filesToDelete = [
            dbPath,
            `${dbPath}-wal`,
            `${dbPath}-shm`,
        ];

        for (const file of filesToDelete) {
            try {
                const info = await getInfoAsync(file);
                if (info.exists) {
                    await deleteAsync(file, { idempotent: true });
                    console.log(`Deleted: ${file}`);
                }
            } catch (e) {
                console.error(`Error deleting ${file}:`, e);
            }
        }
    }

    /**
     * Wipes all database files in the directory (for corruption recovery).
     */
    private async performSafeWipe(dbDir: string) {
        console.log('Wiping all SQLite data...');
        try {
            const files = await readDirectoryAsync(dbDir);
            for (const file of files) {
                await deleteAsync(`${dbDir}/${file}`, { idempotent: true });
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
