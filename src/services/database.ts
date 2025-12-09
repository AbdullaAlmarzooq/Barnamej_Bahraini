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
      'SELECT COUNT(*) as count, SUM(price) as total FROM itinerary_items WHERE itinerary_id = ?',
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
      'SELECT COUNT(*) as count, SUM(price) as total FROM itinerary_items WHERE itinerary_id = ?',
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
        FROM itinerary_items i 
        JOIN attractions a ON i.attraction_id = a.id 
        WHERE i.itinerary_id = ?
    `, [id]);

  itinerary.attractions = items;

  const stats = await db.getFirstAsync<{ total: number }>(
    'SELECT SUM(price) as total FROM itinerary_items WHERE itinerary_id = ?',
    [id]
  );
  itinerary.total_price = stats?.total || 0;

  return itinerary;
};

export const addToItinerary = async (itineraryId: number, attractionId: number) => {
  const db = await getDB();
  await db.runAsync(
    'INSERT INTO itinerary_items (itinerary_id, attraction_id) VALUES (?, ?)',
    [itineraryId, attractionId]
  );
  // Note: Granular sync for items not implemented in this demo, usually you sync the whole itinerary
  return { success: true };
};

export const updateItineraryAttraction = async (linkId: number, startTime: string, endTime: string, price: number, notes: string) => {
  const db = await getDB();
  await db.runAsync(
    'UPDATE itinerary_items SET start_time = ?, end_time = ?, price = ?, notes = ? WHERE id = ?',
    [startTime, endTime, price, notes, linkId]
  );
  return { success: true };
};

export const removeFromItinerary = async (itineraryId: number, attractionId: number) => {
  const db = await getDB();
  await db.runAsync(
    'DELETE FROM itinerary_items WHERE itinerary_id = ? AND attraction_id = ?',
    [itineraryId, attractionId]
  );
  return { success: true };
};

export const deleteItinerary = async (itineraryId: number) => {
  const db = await getDB();
  await db.runAsync('DELETE FROM itineraries WHERE id = ?', [itineraryId]);
  return { success: true };
};
