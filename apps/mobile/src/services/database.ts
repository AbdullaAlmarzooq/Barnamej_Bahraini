import * as SQLite from 'expo-sqlite';
import { getDB } from '../db/client';
import { runMigrations } from '../db/migrator';
import { addToQueue } from '../db/queue/queue';
import { initSyncService } from '../db/queue/sync';

// Initializer
export const initDatabase = async () => {
  try {
    const db = await getDB();
    await runMigrations(db);

    // Start background sync
    initSyncService();

    console.log('Database service initialized locally');
  } catch (error) {
    console.error('Failed to initialize database service:', error);
  }
};

// Attractions
export const getAllAttractions = async () => {
  const db = await getDB();
  return await db.getAllAsync('SELECT * FROM attractions');
};

export const getFeaturedAttractions = async () => {
  const db = await getDB();
  return await db.getAllAsync('SELECT * FROM attractions ORDER BY rating DESC LIMIT 5');
};

export const getAttractionById = async (id: number) => {
  const db = await getDB();
  return await db.getFirstAsync('SELECT * FROM attractions WHERE id = ?', [id]);
};

// Reviews
export const addReview = async (review: any) => {
  const { attraction_id, name, comment, price_rating, cleanliness_rating, service_rating, experience_rating } = review;
  const rating = (price_rating + cleanliness_rating + service_rating + experience_rating) / 4;

  const db = await getDB();

  // 1. Save locally
  await db.runAsync(
    `INSERT INTO reviews (attraction_id, name, comment, rating, price_rating, cleanliness_rating, service_rating, experience_rating) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [attraction_id, name, comment, rating, price_rating, cleanliness_rating, service_rating, experience_rating]
  );

  // 2. Queue for sync
  await addToQueue('review', review);

  // 3. Update local average (optional optimization)
  const result = await db.getFirstAsync<{ avg: number }>('SELECT AVG(rating) as avg FROM reviews WHERE attraction_id = ?', [attraction_id]);
  if (result) {
    await db.runAsync('UPDATE attractions SET rating = ? WHERE id = ?', [result.avg, attraction_id]);
  }

  return { success: true };
};

export const getReviewsForAttraction = async (attractionId: number) => {
  const db = await getDB();
  return await db.getAllAsync('SELECT * FROM reviews WHERE attraction_id = ? ORDER BY created_at DESC', [attractionId]);
};

// Itineraries
export const createItinerary = async (name: string, description: string = '', isPublic: boolean = false, creatorName: string = 'Me') => {
  const db = await getDB();
  const result = await db.runAsync(
    'INSERT INTO itineraries (name, description, is_public, creator_name) VALUES (?, ?, ?, ?)',
    [name, description, isPublic ? 1 : 0, creatorName]
  );

  const id = result.lastInsertRowId;

  // Queue for sync
  await addToQueue('itinerary', { id, name, description, is_public: isPublic, creator_name: creatorName });

  return { id };
};

export const getItineraries = async () => {
  const db = await getDB();
  const itineraries = await db.getAllAsync<any>('SELECT * FROM itineraries ORDER BY created_at DESC');

  for (let it of itineraries) {
    const stats = await db.getFirstAsync<{ count: number, total: number }>(
      'SELECT COUNT(*) as count, SUM(price) as total FROM itinerary_attractions WHERE itinerary_id = ?',
      [it.id]
    );
    it.attraction_count = stats?.count || 0;
    it.total_price = stats?.total || 0;
  }

  return itineraries;
};

export const getPublicItineraries = async () => {
  const db = await getDB();
  const itineraries = await db.getAllAsync<any>('SELECT * FROM itineraries WHERE is_public = 1 ORDER BY created_at DESC');
  // ... (same stats logic as above, ideally refactor)
  for (let it of itineraries) {
    const stats = await db.getFirstAsync<{ count: number, total: number }>(
      'SELECT COUNT(*) as count, SUM(price) as total FROM itinerary_attractions WHERE itinerary_id = ?',
      [it.id]
    );
    it.attraction_count = stats?.count || 0;
    it.total_price = stats?.total || 0;
  }
  return itineraries;
};

export const getItineraryDetails = async (id: number) => {
  const db = await getDB();
  const itinerary = await db.getFirstAsync<any>('SELECT * FROM itineraries WHERE id = ?', [id]);

  if (!itinerary) return null;

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
        FROM itinerary_attractions i 
        JOIN attractions a ON i.attraction_id = a.id 
        WHERE i.itinerary_id = ?
        ORDER BY i.sort_order ASC
    `, [id]);

  itinerary.attractions = items;

  const stats = await db.getFirstAsync<{ total: number }>(
    'SELECT SUM(price) as total FROM itinerary_attractions WHERE itinerary_id = ?',
    [id]
  );
  itinerary.total_price = stats?.total || 0;

  return itinerary;
};

export const addToItinerary = async (itineraryId: number, attractionId: number) => {
  const db = await getDB();

  // Fetch default price from attraction
  const attraction = await db.getFirstAsync<{ price: number }>('SELECT price FROM attractions WHERE id = ?', [attractionId]);
  const price = attraction?.price || 0;

  // Check for auto-sort preference
  // Check for auto-sort preference and public status
  const itinerary = await db.getFirstAsync<{ is_auto_sort_enabled: number, is_public: number }>('SELECT is_auto_sort_enabled, is_public FROM itineraries WHERE id = ?', [itineraryId]);
  const isAutoSort = itinerary?.is_auto_sort_enabled === 1;
  // Note: We don't block ADDING to public itineraries (owner might add), but we block REORDERING if public?
  // User req: "If is_public = 1: Reject reorder attempts; Reject auto-sort execution"
  // Adding is technically a reorder if we insert at sort_order?
  // Let's assume owner CAN add, but auto-sort behaviors are restricted if public.


  let sortOrder = 0;
  // If manual, append to end
  if (!isAutoSort) {
    const maxSort = await db.getFirstAsync<{ max: number }>('SELECT MAX(sort_order) as max FROM itinerary_attractions WHERE itinerary_id = ?', [itineraryId]);
    sortOrder = (maxSort?.max ?? -1) + 1;
  }

  await db.runAsync(
    'INSERT INTO itinerary_attractions (itinerary_id, attraction_id, price, sort_order) VALUES (?, ?, ?, ?)',
    [itineraryId, attractionId, price, sortOrder]
  );

  if (isAutoSort) {
    // Is Public check?
    // Requirement: "If is_public = 1: Reject auto-sort execution"
    // However, addToItinerary implies owner is editing. 
    // Usually is_public means "published". 
    // If published, maybe we shouldn't act? 
    // The requirement says: "If is_public = 1: Reject reorder attempts; Reject auto-sort execution"
    // Let's add that check safe guard in applyAutoSort or here.
    const isPublic = itinerary?.is_public === 1;
    if (!isPublic) {
      await applyAutoSort(db, itineraryId);
    }
  }
  // Note: Granular sync for items not implemented in this demo, usually you sync the whole itinerary
  return { success: true };
};

export const updateItineraryAttraction = async (linkId: number, startTime: string, endTime: string, price: number, notes: string) => {
  const db = await getDB();
  await db.runAsync(
    'UPDATE itinerary_attractions SET start_time = ?, end_time = ?, price = ?, notes = ? WHERE id = ?',
    [startTime, endTime, price, notes, linkId]
  );

  // Check if we need to re-sort
  const link = await db.getFirstAsync<{ itinerary_id: number }>('SELECT itinerary_id FROM itinerary_attractions WHERE id = ?', [linkId]);
  if (link) {
    const itinerary = await db.getFirstAsync<{ is_auto_sort_enabled: number, is_public: number }>('SELECT is_auto_sort_enabled, is_public FROM itineraries WHERE id = ?', [link.itinerary_id]);
    if (itinerary?.is_auto_sort_enabled === 1 && itinerary?.is_public !== 1) {
      await applyAutoSort(db, link.itinerary_id);
    }
  }

  return { success: true };
};

export const reorderItineraryAttractions = async (itineraryId: number, orderedIds: number[]) => {
  const db = await getDB();

  // Check if public
  const itinerary = await db.getFirstAsync<{ is_public: number }>('SELECT is_public FROM itineraries WHERE id = ?', [itineraryId]);
  if (itinerary?.is_public === 1) {
    throw new Error("Cannot manually reorder a public itinerary"); // Or return { success: false }
  }

  // Updating one by one in a transaction would be ideal, but for now simple loop
  for (let i = 0; i < orderedIds.length; i++) {
    await db.runAsync('UPDATE itinerary_attractions SET sort_order = ? WHERE id = ?', [i, orderedIds[i]]);
  }

  // Disable auto-sort since manual order is applied
  await db.runAsync('UPDATE itineraries SET is_auto_sort_enabled = 0 WHERE id = ?', [itineraryId]);

  return { success: true };
};

export const toggleItineraryAutoSort = async (itineraryId: number, enable: boolean) => {
  const db = await getDB();
  const itinerary = await db.getFirstAsync<{ is_public: number }>('SELECT is_public FROM itineraries WHERE id = ?', [itineraryId]);
  if (itinerary?.is_public === 1) {
    if (enable) throw new Error("Cannot enable auto-sort on public itinerary");
    // If disabling, maybe okay? Requirements say "Reject auto-sort execution".
  }

  await db.runAsync('UPDATE itineraries SET is_auto_sort_enabled = ? WHERE id = ?', [enable ? 1 : 0, itineraryId]);

  if (enable) {
    await applyAutoSort(db, itineraryId);
  }

  return { success: true };
};

// Helper for auto-sorting logic
const applyAutoSort = async (db: SQLite.SQLiteDatabase, itineraryId: number) => {
  const items = await db.getAllAsync<{ id: number, start_time: string | null, sort_order: number }>(
    'SELECT id, start_time, sort_order FROM itinerary_attractions WHERE itinerary_id = ? ORDER BY sort_order ASC',
    [itineraryId]
  );

  const timed = items.filter((i: any) => i.start_time !== null);
  const untimed = items.filter((i: any) => i.start_time === null);

  timed.sort((a: any, b: any) => {
    if (a.start_time < b.start_time) return -1;
    if (a.start_time > b.start_time) return 1;
    return 0;
  });

  const sorted = [...timed, ...untimed];

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].sort_order !== i) {
      await db.runAsync('UPDATE itinerary_attractions SET sort_order = ? WHERE id = ?', [i, sorted[i].id]);
    }
  }
};

export const removeFromItinerary = async (itineraryId: number, attractionId: number) => {
  const db = await getDB();
  await db.runAsync(
    'DELETE FROM itinerary_attractions WHERE itinerary_id = ? AND attraction_id = ?',
    [itineraryId, attractionId]
  );

  await normalizeItineraryOrder(db, itineraryId);
  return { success: true };
};

// 1. One-Time sort_order Normalization Helper
export const normalizeSortOrders = async () => {
  const db = await getDB();
  const itineraries = await db.getAllAsync<{ id: number }>('SELECT id FROM itineraries');

  for (const it of itineraries) {
    await normalizeItineraryOrder(db, it.id);
  }
  return { success: true };
};

// Helper to normalize a single itinerary's sort_order sequentially
// Used by normalizeSortOrders and after deletion
const normalizeItineraryOrder = async (db: SQLite.SQLiteDatabase, itineraryId: number) => {
  // Fetches attractions ordered by current sort_order (or id if sort_order is 0/messy, but requirement says "ordered by id ASC" for One-Time)
  // Requirement for One-Time: "Fetches itinerary_attractions ordered by id ASC"
  // Requirement for Delete Fix: "Preserve their current relative order" -> This means order by sort_order

  // To handle both with one function, we need to know context or just prefer sort_order?
  // "One-Time ... Fetches itinerary_attractions ordered by id ASC" -> assumes current sort_order is garbage/all 0.
  // "Fix sort_order After Deletion ... Re-normalize ... Preserve their current relative order" -> assumes sort_order is VALID but has gaps.

  // If we use 'ORDER BY sort_order ASC, id ASC', it works for both:
  // Case 1 (All 0s): sort_order is tie, falls back to id ASC. (Matches "ordered by id ASC")
  // Case 2 (Gaps): sort_order preserves relative order.

  const items = await db.getAllAsync<{ id: number }>('SELECT id FROM itinerary_attractions WHERE itinerary_id = ? ORDER BY sort_order ASC, id ASC', [itineraryId]);

  for (let i = 0; i < items.length; i++) {
    await db.runAsync('UPDATE itinerary_attractions SET sort_order = ? WHERE id = ?', [i, items[i].id]);
  }
};

export const deleteItinerary = async (itineraryId: number) => {
  const db = await getDB();
  await db.runAsync('DELETE FROM itineraries WHERE id = ?', [itineraryId]);
  return { success: true };
};
