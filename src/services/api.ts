import NetInfo from '@react-native-community/netinfo';

// API Configuration
// IMPORTANT: Update this with your actual local IP address
// Find your IP: Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux)
const API_BASE_URL = __DEV__
    ? 'http://192.168.100.38:3000'  // TODO: Replace 192.168.1.5 with YOUR computer's IP
    : 'https://api.yourapp.com';  // Production URL

interface ApiResponse {
    success: boolean;
    data?: any;
    error?: string;
}

// Network status check
export const isOnline = async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
};

// Generic API request wrapper
const apiRequest = async (
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any
): Promise<ApiResponse> => {
    try {
        const online = await isOnline();

        if (!online) {
            // TODO: Add to offline queue here
            console.warn('Offline: Request will be queued');
            return { success: false, error: 'Device is offline' };
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.message || 'Request failed' };
        }

        return { success: true, data };
    } catch (error) {
        console.error('API Request Error:', error);
        return { success: false, error: 'Network error' };
    }
};

// ============================================
// USER DATA SYNC FUNCTIONS
// ============================================

/**
 * Submit a review to the backend server
 */
export const postReview = async (review: {
    attraction_id: number;
    name: string;
    comment: string;
    rating: number;
    price_rating: number;
    cleanliness_rating: number;
    service_rating: number;
    experience_rating: number;
}): Promise<ApiResponse> => {
    return apiRequest('/reviews', 'POST', review);
};

/**
 * Submit an itinerary to the backend server
 */
export const postItinerary = async (itinerary: {
    name: string;
    description?: string;
    is_public?: boolean;
    creator_name?: string;
    attractions?: number[];  // Array of attraction IDs
}): Promise<ApiResponse> => {
    return apiRequest('/itineraries', 'POST', itinerary);
};

/**
 * Submit a favorite to the backend server
 */
export const postFavorite = async (favorite: {
    user_id: string;
    attraction_id: number;
}): Promise<ApiResponse> => {
    return apiRequest('/favorites', 'POST', favorite);
};

// ============================================
// OFFLINE QUEUE MANAGEMENT
// ============================================

export interface QueuedRequest {
    id: string;
    endpoint: string;
    method: string;
    body: any;
    timestamp: number;
}

let offlineQueue: QueuedRequest[] = [];

/**
 * Add a failed request to the offline queue
 */
export const addToQueue = (request: Omit<QueuedRequest, 'id' | 'timestamp'>) => {
    const queuedRequest: QueuedRequest = {
        ...request,
        id: Date.now().toString(),
        timestamp: Date.now(),
    };

    offlineQueue.push(queuedRequest);
    console.log(`Added request to offline queue: ${queuedRequest.id}`);
};

/**
 * Process all queued requests when online
 */
export const processQueue = async (): Promise<void> => {
    const online = await isOnline();

    if (!online || offlineQueue.length === 0) {
        return;
    }

    console.log(`Processing ${offlineQueue.length} queued requests...`);

    const failedRequests: QueuedRequest[] = [];

    for (const request of offlineQueue) {
        const response = await apiRequest(request.endpoint, request.method as any, request.body);

        if (!response.success) {
            failedRequests.push(request);
        } else {
            console.log(`Successfully synced queued request: ${request.id}`);
        }
    }

    offlineQueue = failedRequests;

    if (failedRequests.length > 0) {
        console.warn(`${failedRequests.length} requests failed to sync`);
    }
};

/**
 * Get the current offline queue
 */
export const getQueue = (): QueuedRequest[] => {
    return [...offlineQueue];
};

/**
 * Clear the offline queue (use with caution)
 */
export const clearQueue = () => {
    offlineQueue = [];
    console.log('Offline queue cleared');
};
