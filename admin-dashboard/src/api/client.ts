// API Client for admin dashboard

import type { Attraction, AttractionPhoto, Review, Itinerary, Statistics } from '../types';

// Use the same API base URL as the mobile app
// Update this to match your server's IP address
const API_BASE_URL = 'http://localhost:3000';

// Helper function for making API requests
async function apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
): Promise<T> {
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
}

// ============================================
// ATTRACTIONS API
// ============================================

export async function fetchAttractions(): Promise<Attraction[]> {
    return apiRequest<Attraction[]>('/attractions');
}

export async function fetchAttraction(id: number): Promise<Attraction> {
    return apiRequest<Attraction>(`/attractions/${id}`);
}

export async function createAttraction(data: Omit<Attraction, 'id'>): Promise<{ id: number }> {
    return apiRequest<{ id: number }>('/api/admin/attractions', 'POST', data);
}

export async function updateAttraction(id: number, data: Partial<Attraction>): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/admin/attractions/${id}`, 'PUT', data);
}

export async function deleteAttraction(id: number): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/admin/attractions/${id}`, 'DELETE');
}

// ============================================
// ATTRACTION PHOTOS API
// ============================================

export async function fetchAttractionPhotos(attractionId: number): Promise<AttractionPhoto[]> {
    return apiRequest<AttractionPhoto[]>(`/api/admin/attractions/${attractionId}/photos`);
}

export async function addAttractionPhoto(attractionId: number, url: string): Promise<AttractionPhoto> {
    return apiRequest<AttractionPhoto>(`/api/admin/attractions/${attractionId}/photos`, 'POST', { url });
}

export async function deleteAttractionPhoto(photoId: number): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/admin/photos/${photoId}`, 'DELETE');
}

export async function setPrimaryPhoto(photoId: number): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/admin/photos/${photoId}/set-primary`, 'PUT');
}

// ============================================
// REVIEWS API
// ============================================

export async function fetchReviews(attractionId?: number): Promise<Review[]> {
    const endpoint = attractionId ? `/attractions/${attractionId}/reviews` : '/api/admin/reviews';
    return apiRequest<Review[]>(endpoint);
}

export async function deleteReview(id: number): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/admin/reviews/${id}`, 'DELETE');
}

// ============================================
// ITINERARIES API
// ============================================

export async function fetchItineraries(filter: 'all' | 'public' | 'private' = 'all'): Promise<Itinerary[]> {
    let queryVal = 'all';
    if (filter === 'public') queryVal = 'true';
    if (filter === 'private') queryVal = 'false';
    return apiRequest<Itinerary[]>(`/itineraries?public=${queryVal}`);
}

export async function fetchItinerary(id: number): Promise<Itinerary> {
    return apiRequest<Itinerary>(`/itineraries/${id}`);
}

export async function createItinerary(data: Omit<Itinerary, 'id' | 'created_at' | 'total_price' | 'attraction_count'>): Promise<{ id: number }> {
    return apiRequest<{ id: number }>('/itineraries', 'POST', data);
}

export async function updateItinerary(id: number, data: Partial<Itinerary>): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/admin/itineraries/${id}`, 'PUT', data);
}

export async function deleteItinerary(id: number): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/itineraries/${id}`, 'DELETE');
}

export async function addItineraryAttraction(itineraryId: number, attractionId: number): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/itineraries/${itineraryId}/attractions`, 'POST', { attraction_id: attractionId });
}

export async function updateItineraryAttraction(linkId: number, data: { start_time?: string; end_time?: string; price?: number; notes?: string }): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/itineraries/attractions/${linkId}`, 'PUT', data);
}

export async function removeItineraryAttraction(itineraryId: number, attractionId: number): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/itineraries/${itineraryId}/attractions/${attractionId}`, 'DELETE');
}

// ============================================
// STATISTICS API
// ============================================

export async function fetchStatistics(): Promise<Statistics> {
    return apiRequest<Statistics>('/api/admin/statistics');
}
