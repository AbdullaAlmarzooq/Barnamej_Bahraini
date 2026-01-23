
import { SQLiteDatabase } from 'expo-sqlite';

export const up = async (db: SQLiteDatabase) => {
    // 1. Add sort_order and auto_sort_enabled columns
    await db.execAsync(`
        ALTER TABLE itinerary_attractions ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE itinerary_attractions ADD COLUMN auto_sort_enabled INTEGER NOT NULL DEFAULT 0;
    `);

    // 2. Initialize sort_order for existing records
    // Since SQLite ALTER TABLE doesn't support complex logic, we do it in two steps.
    // We want to preserve current insertion order. Luckily, usually rowid or id implies insertion order.
    // We will group by itinerary_id and assign sequential sort_order.

    const items = await db.getAllAsync<{ id: number, itinerary_id: number }>(
        'SELECT id, itinerary_id FROM itinerary_attractions ORDER BY itinerary_id, id'
    );

    const updates = [];
    let currentItineraryId = -1;
    let rank = 0;

    for (const item of items) {
        if (item.itinerary_id !== currentItineraryId) {
            currentItineraryId = item.itinerary_id;
            rank = 0;
        }
        updates.push(db.runAsync('UPDATE itinerary_attractions SET sort_order = ? WHERE id = ?', [rank, item.id]));
        rank++;
    }

    await Promise.all(updates);
};

export const down = async (db: SQLiteDatabase) => {
    // SQLite does not support DROP COLUMN until recently, but usually we don't need strict down in this context.
    // However, if needed, we'd have to recreate the table.
    // For simplicity, we will ignore dropping columns as it's complex in SQLite (requires temp table).
    console.warn('Down migration for 0004_add_itinerary_sorting is skipped (DROP COLUMN complexity).');
};
