import { ReviewSchema, ItinerarySchema } from '../db/utils/validators';
import { addToQueue } from '../db/queue/queue';

// Temporary until we implement full API
// This simulates the interface expected by sync.ts

export const postReview = async (payload: any) => {
    // In real app, this would be axios.post(...)
    // For now, we simulate a network call
    console.log('[API] POSTing review:', payload);
    return { success: true };
};

export const postItinerary = async (payload: any) => {
    console.log('[API] POSTing itinerary:', payload);
    return { success: true };
};
