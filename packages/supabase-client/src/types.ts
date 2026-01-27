/**
 * TypeScript types matching docs/database/schema.md
 * This is the single source of truth for all Supabase queries.
 */

// ============================================
// ENUMS (matching PostgreSQL enums)
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
// REFERENCE TABLES
// ============================================

export interface Nationality {
    id: string;
    name: string;
    code: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ============================================
// CORE TABLES
// ============================================

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
}

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
    overall_rating: number; // Computed field
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
    is_active: boolean;
    creator_name: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
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
}

export interface SyncLog {
    id: string;
    user_id: string | null;
    device_id: string | null;
    operation_type: string;
    table_name: string | null;
    record_id: string | null;
    status: string;
    error_message: string | null;
    retry_count: number;
    payload: Record<string, unknown> | null;
    created_at: string;
}

// ============================================
// INPUT TYPES (for creating/updating)
// ============================================

export type AttractionInput = Omit<Attraction,
    'id' | 'slug' | 'avg_rating' | 'total_reviews' | 'created_at' | 'updated_at' | 'deleted_at'
>;

export type AttractionPhotoInput = Omit<AttractionPhoto,
    'id' | 'created_at' | 'updated_at' | 'deleted_at'
>;

export type ReviewInput = Pick<Review,
    'attraction_id' | 'reviewer_name' | 'comment' | 'price_rating' | 'cleanliness_rating' | 'service_rating' | 'experience_rating'
> & Partial<Pick<Review, 'age' | 'nationality_id' | 'user_id'>>;

export type ItineraryInput = Pick<Itinerary,
    'name'
> & Partial<Pick<Itinerary, 'description' | 'is_public' | 'creator_name' | 'user_id' | 'start_date' | 'end_date'>>;

export type ItineraryAttractionInput = Pick<ItineraryAttraction,
    'itinerary_id' | 'attraction_id' | 'position'
> & Partial<Pick<ItineraryAttraction, 'scheduled_start_time' | 'scheduled_end_time' | 'custom_price' | 'notes' | 'added_by'>>;

// ============================================
// VIEWS & JOINED TYPES
// ============================================

export interface AttractionWithPhoto extends Attraction {
    primary_photo_path: string | null;
    primary_photo_bucket: string | null;
}

export interface AttractionWithPhotos extends Attraction {
    photos: AttractionPhoto[];
}

export interface ItineraryWithAttractions extends Itinerary {
    attractions: (ItineraryAttraction & { attraction: Attraction })[];
}

export interface ReviewWithAttraction extends Review {
    attraction: Pick<Attraction, 'id' | 'name'>;
}

export interface ReviewWithNationality extends Review {
    nationality: Pick<Nationality, 'id' | 'name'> | null;
}

// ============================================
// STATISTICS
// ============================================

export interface Statistics {
    total_attractions: number;
    total_reviews: number;
    total_itineraries: number;
    average_rating: number;
}
