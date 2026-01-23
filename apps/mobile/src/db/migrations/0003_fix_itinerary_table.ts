import { SQLiteDatabase } from 'expo-sqlite';

export const up = async (db: SQLiteDatabase) => {
    // Check if target table already exists
    const targetExists = await db.getFirstAsync<{ count: number }>(
        "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='itinerary_attractions'"
    );

    if (!targetExists?.count) {
        // Rename table to match code usage
        await db.execAsync(`ALTER TABLE itinerary_items RENAME TO itinerary_attractions;`);
    }

    // Backfill prices from attractions table for existing items where price is 0
    await db.execAsync(`
        UPDATE itinerary_attractions 
        SET price = (
            SELECT price 
            FROM attractions 
            WHERE attractions.id = itinerary_attractions.attraction_id
        )
        WHERE price = 0 OR price IS NULL;
    `);
};

export const down = async (db: SQLiteDatabase) => {
    await db.execAsync(`
        ALTER TABLE itinerary_attractions RENAME TO itinerary_items;
    `);
};
