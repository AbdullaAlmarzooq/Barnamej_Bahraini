import { getDB } from '../client';
import { runTransaction } from '../utils/execute';

export interface QueueItem {
    id: number;
    type: string;
    payload: any;
    status: 'pending' | 'retry' | 'failed';
    retry_count: number;
    priority: number;
    created_at: string;
}

export const addToQueue = async (
    type: string,
    payload: any,
    priority: number = 1
): Promise<void> => {
    const db = await getDB();
    await db.runAsync(
        'INSERT INTO sync_queue (type, payload, priority) VALUES (?, ?, ?)',
        [type, JSON.stringify(payload), priority]
    );
};

export const getNextBatch = async (limit: number = 10): Promise<QueueItem[]> => {
    const db = await getDB();
    const rows = await db.getAllAsync<any>(
        `SELECT * FROM sync_queue 
     WHERE status IN ('pending', 'retry') 
     ORDER BY priority DESC, created_at ASC 
     LIMIT ?`,
        [limit]
    );

    return rows.map(row => ({
        ...row,
        payload: JSON.parse(row.payload)
    }));
};

export const markAsSynced = async (id: number): Promise<void> => {
    const db = await getDB();
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
};

export const incrementRetry = async (id: number, error: string): Promise<void> => {
    const db = await getDB();
    await db.runAsync(
        `UPDATE sync_queue 
     SET status = CASE WHEN retry_count >= 5 THEN 'failed' ELSE 'retry' END,
         retry_count = retry_count + 1,
         last_error = ?
     WHERE id = ?`,
        [error, id]
    );
};
