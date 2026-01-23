import NetInfo from '@react-native-community/netinfo';
import { getNextBatch, markAsSynced, incrementRetry } from './queue';
import * as ReviewsApi from '../../api/reviews';
import * as ItinerariesApi from '../../api/itineraries';

let isSyncing = false;

export const syncQueue = async () => {
    if (isSyncing) return;

    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    isSyncing = true;
    console.log('Starting sync...');

    try {
        const batch = await getNextBatch();

        for (const item of batch) {
            try {
                console.log(`Syncing item ${item.id} (${item.type})`);

                let success = false;

                switch (item.type) {
                    case 'review':
                        const resultReview = await ReviewsApi.postReview(item.payload);
                        success = resultReview.success;
                        break;
                    case 'itinerary':
                        const resultItinerary = await ItinerariesApi.postItinerary(item.payload);
                        success = resultItinerary.success;
                        break;
                    default:
                        console.warn(`Unknown sync type: ${item.type}`);
                        // If unknown, maybe delete or mark failed? marking failed for safety
                        await incrementRetry(item.id, 'Unknown sync type');
                        continue;
                }

                if (success) {
                    await markAsSynced(item.id);
                    console.log(`Item ${item.id} synced successfully`);
                } else {
                    await incrementRetry(item.id, 'API returned error');
                }
            } catch (e: any) {
                console.error(`Failed to sync item ${item.id}`, e);
                await incrementRetry(item.id, e.message || 'Network exception');
            }
        }
    } catch (error) {
        console.error('Sync process failed', error);
    } finally {
        isSyncing = false;
    }
};

// Hook or service to start listener
export const initSyncService = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected) {
            syncQueue();
        }
    });

    // Also try on startup
    syncQueue();

    return unsubscribe;
};
