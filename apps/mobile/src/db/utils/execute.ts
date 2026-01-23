import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Execute a write operation in a transaction
 */
export const runTransaction = async <T>(
    db: SQLiteDatabase,
    callback: () => Promise<T>
): Promise<T> => {
    let result: T | undefined;
    await db.withTransactionAsync(async () => {
        result = await callback();
    });
    // @ts-ignore: We rely on the callback being executed inside the transaction
    return result;
};

/**
 * Execute a batch of SQL statements safe against SQL injection
 */
export const execBatch = async (
    db: SQLiteDatabase,
    statements: { sql: string; args?: any[] }[]
): Promise<void> => {
    await db.withTransactionAsync(async () => {
        for (const stmt of statements) {
            await db.runAsync(stmt.sql, stmt.args || []);
        }
    });
};
