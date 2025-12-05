// TypeScript interfaces for the admin dashboard

export interface AttractionPhoto {
    id: number;
    attraction_id: number;
    url: string;
    is_primary: number;
    display_order: number;
    created_at: string;
}

export interface Attraction {
    id: number;
    name: string;
    description: string;
    category: string;
    location: string;
    image: string; // Primary photo URL (backward compatibility)
    rating: number;
    price?: number;
    photos?: AttractionPhoto[]; // All photos for this attraction
}

export interface Review {
    id: number;
    attraction_id: number;
    name: string;
    comment: string;
    rating: number;
    price_rating: number;
    cleanliness_rating: number;
    service_rating: number;
    experience_rating: number;
    created_at: string;
}

export interface Itinerary {
    id: number;
    name: string;
    description?: string;
    is_public: boolean;
    creator_name: string;
    created_at: string;
    attraction_count?: number;
    total_price?: number;
    attractions?: ItineraryAttraction[];
}

export interface ItineraryAttraction extends Attraction {
    link_id: number;
    start_time?: string;
    end_time?: string;
    price: number;
    notes?: string;
}

export interface Statistics {
    total_attractions: number;
    total_reviews: number;
    total_itineraries: number;
    average_rating: number;
}
