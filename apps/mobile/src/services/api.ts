/**
 * Mobile App API Utilities
 * 
 * @deprecated This file contains legacy API code that is being migrated to Supabase.
 * For new code, use the APIs in ../api/ folder which connect to Supabase directly.
 * 
 * This file is kept for:
 * - Network status utilities (isOnline)
 * - Backward compatibility during migration
 */

import NetInfo from '@react-native-community/netinfo'

// ============================================
// NETWORK UTILITIES (Still used)
// ============================================

/**
 * Check if the device is online
 */
export const isOnline = async (): Promise<boolean> => {
    const state = await NetInfo.fetch()
    return state.isConnected ?? false
}

// ============================================
// LEGACY OFFLINE QUEUE (Deprecated)
// ============================================

/**
 * @deprecated Use the sync queue in ../db/queue/queue.ts instead
 */
export interface QueuedRequest {
    id: string
    endpoint: string
    method: string
    body: any
    timestamp: number
}

let offlineQueue: QueuedRequest[] = []

/**
 * @deprecated Use addToQueue from ../db/queue/queue.ts
 */
export const addToQueue = (request: Omit<QueuedRequest, 'id' | 'timestamp'>) => {
    const queuedRequest: QueuedRequest = {
        ...request,
        id: Date.now().toString(),
        timestamp: Date.now(),
    }
    offlineQueue.push(queuedRequest)
    console.warn('[Deprecated] Using legacy queue. Migrate to db/queue/queue.ts')
}

/**
 * @deprecated Not used with Supabase
 */
export const processQueue = async (): Promise<void> => {
    console.warn('[Deprecated] processQueue is no longer used. Supabase sync handles this.')
}

/**
 * @deprecated
 */
export const getQueue = (): QueuedRequest[] => {
    return [...offlineQueue]
}

/**
 * @deprecated
 */
export const clearQueue = () => {
    offlineQueue = []
    console.log('Offline queue cleared')
}
