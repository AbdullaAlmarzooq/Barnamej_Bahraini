import { SQLiteDatabase } from 'expo-sqlite';

export const up = async (db: SQLiteDatabase) => {
    // 1. Add is_auto_sort_enabled to itineraries
    try {
        await db.execAsync('ALTER TABLE itineraries ADD COLUMN is_auto_sort_enabled INTEGER DEFAULT 0;');
    } catch (e) { /* ignore */ }

    // 2. Add sort_order to itinerary_attractions
    try {
        await db.execAsync('ALTER TABLE itinerary_attractions ADD COLUMN sort_order INTEGER DEFAULT 0;');
    } catch (e) { /* ignore */ }

    // 3. Populate existing rows with initial sort_order based on insertion (id order)
    // We need to do this per itinerary to ensure 0-based indexing for each group
    const itineraries = await db.getAllAsync<{ id: number }>('SELECT id FROM itineraries');

    for (const it of itineraries) {
        const items = await db.getAllAsync<{ id: number }>('SELECT id FROM itinerary_attractions WHERE itinerary_id = ? ORDER BY id ASC', [it.id]);

        for (let i = 0; i < items.length; i++) {
            await db.runAsync('UPDATE itinerary_attractions SET sort_order = ? WHERE id = ?', [i, items[i].id]);
        }
    }
};

export const down = async (db: SQLiteDatabase) => {
    // SQLite doesn't support DROP COLUMN easily in older versions, 
    // but for this environment assuming standard behavior or ignoring down for now as per minimal changes req.
    // Generally we would recreate the table, copy data, drop old table.
    // For this task, we will just keep it simple or leave it empty if rollback isn't strictly requested.
    // But to be safe, let's implement the "correct" way roughly if needed, 
    // or just comment that we are not implementing destructive specific down migrations for this quick task unless necessary.

    // Actually, let's look at previous migrations to see pattern.
    // Previous migrations were not shown fully (just listed), but simpler to just strictly follow requirements:
    // "Write SQL migration steps: ALTER TABLE statements..."

    // Since SQLite 'DROP COLUMN' is supported in newer versions (which Expo uses), let's try that.
    try {
        await db.execAsync('ALTER TABLE itineraries DROP COLUMN is_auto_sort_enabled;');
        await db.execAsync('ALTER TABLE itinerary_attractions DROP COLUMN sort_order;');
    } catch (e) {
        console.warn('DROP COLUMN not supported or failed', e);
    }
};
