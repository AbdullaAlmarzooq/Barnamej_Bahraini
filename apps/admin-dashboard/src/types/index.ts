/**
 * TypeScript interfaces for the admin dashboard
 * Updated to match docs/database/schema.md with UUID types
 */

// ============================================
// ENUMS
// ============================================

export type AttractionCategory =
    | 'historical'
    | 'landmark'
    | 'nature'
    | 'religious'
    | 'museum'
    | 'cultural'
    | 'entertainment'
    | 'shopping'
    | 'dining';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

// ============================================
// CORE TYPES
// ============================================

export interface AttractionPhoto {
    id: string;
    attraction_id: string;
    storage_path: string;
    storage_bucket: string;
    caption: string | null;
    alt_text: string | null;
    width: number | null;
    height: number | null;
    file_size_bytes: number | null;
    mime_type: string | null;
    display_order: number;
    is_primary: boolean;
    is_active: boolean;
    uploaded_by: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface Attraction {
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
    category: AttractionCategory;
    location: string | null;
    latitude: number | null;
    longitude: number | null;
    price: number;
    estimated_duration_minutes: number | null;
    avg_rating: number;
    total_reviews: number;
    metadata: Record<string, unknown>;
    is_featured: boolean;
    is_active: boolean;
    created_by: string | null;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Joined data
    photos?: AttractionPhoto[];
    primary_photo_path?: string | null;
    primary_photo_bucket?: string | null;
}

export interface Review {
    id: string;
    attraction_id: string;
    user_id: string | null;
    reviewer_name: string | null;
    comment: string | null;
    price_rating: number;
    cleanliness_rating: number;
    service_rating: number;
    experience_rating: number;
    overall_rating: number;
    age: number | null;
    nationality_id: string | null;
    status: ReviewStatus;
    moderation_notes: string | null;
    moderated_by: string | null;
    moderated_at: string | null;
    helpful_count: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Joined data
    attraction?: { id: string; name: string };
    nationality?: { id: string; name: string } | null;
}

export interface Itinerary {
    id: string;
    user_id: string | null;
    name: string;
    description: string | null;
    is_public: boolean;
    is_featured: boolean;
    auto_sort_enabled: boolean;
    total_price: number;
    total_attractions: number;
    estimated_duration_minutes: number;
    start_date: string | null;
    end_date: string | null;
    metadata: Record<string, unknown>;
    mode: 'flexible' | 'scheduled';
    is_active: boolean;
    creator_name: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Joined data
    attractions?: ItineraryAttraction[];
    creator?: { full_name: string | null };
}

export interface ItineraryAttraction {
    id: string;
    itinerary_id: string;
    attraction_id: string;
    scheduled_start_time: string | null;
    scheduled_end_time: string | null;
    custom_price: number | null;
    notes: string | null;
    position: number;
    added_by: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Joined data
    attraction?: Attraction;
}

export interface Nationality {
    id: string;
    name: string;
    code: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Statistics {
    total_attractions: number;
    total_reviews: number;
    total_itineraries: number;
    average_rating: number;
}

export interface CategoryRating {
    category: AttractionCategory;
    average_rating: number;
    total_reviews: number;
    attraction_count: number;
}

export interface ReviewTrendPoint {
    week_start: string;
    count: number;
}
