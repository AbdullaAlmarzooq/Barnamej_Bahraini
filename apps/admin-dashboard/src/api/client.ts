/**
 * Admin Dashboard API Client
 * Uses Supabase services directly instead of legacy Express API
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for browser
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Import types
import type {
    Attraction,
    AttractionPhoto,
    Review,
    Itinerary,
    ItineraryAttraction,
    Statistics
} from '../types'

// ============================================
// ATTRACTIONS API
// ============================================

export async function fetchAttractions(): Promise<Attraction[]> {
    const { data, error } = await supabase
        .from('attractions_with_photo')
        .select(`
      *,
      photos:attraction_photos(*)
    `)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name')

    if (error) throw new Error(error.message)

    // Filter out deleted photos
    return (data || []).map(attraction => ({
        ...attraction,
        photos: (attraction.photos || []).filter(
            (p: AttractionPhoto) => p.deleted_at === null
        )
    }))
}

export async function fetchAttraction(id: string): Promise<Attraction> {
    const { data, error } = await supabase
        .from('attractions_with_photo')
        .select(`
      *,
      photos:attraction_photos(*)
    `)
        .eq('id', id)
        .is('deleted_at', null)
        .single()

    if (error) throw new Error(error.message)

    if (data) {
        data.photos = (data.photos || []).filter(
            (p: AttractionPhoto) => p.deleted_at === null
        )
    }

    return data
}

export async function createAttraction(input: Partial<Attraction>): Promise<{ id: string }> {
    const { data, error } = await supabase
        .from('attractions')
        .insert(input)
        .select('id')
        .single()

    if (error) throw new Error(error.message)
    return { id: data.id }
}

export async function updateAttraction(id: string, input: Partial<Attraction>): Promise<{ success: boolean; data?: Attraction }> {
    const { data, error } = await supabase
        .from('attractions')
        .update(input)
        .eq('id', id)
        .select()

    if (error) throw new Error(error.message)

    // Check if any row was actually updated
    if (!data || data.length === 0) {
        throw new Error('Update failed: Attraction not found or permission denied')
    }

    return { success: true, data: data[0] }
}

export async function deleteAttraction(id: string): Promise<{ success: boolean }> {
    // Soft delete
    const { error } = await supabase
        .from('attractions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw new Error(error.message)
    return { success: true }
}


// ============================================
// REVIEWS API
// ============================================

export async function fetchReviews(attractionId?: string): Promise<Review[]> {
    let query = supabase
        .from('reviews')
        .select(`
      *,
      attraction:attractions(id, name)
    `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (attractionId) {
        query = query.eq('attraction_id', attractionId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
}

export async function deleteReview(id: string): Promise<{ success: boolean }> {
    // Soft delete
    const { error } = await supabase
        .from('reviews')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw new Error(error.message)
    return { success: true }
}

export async function moderateReview(
    id: string,
    status: 'approved' | 'rejected' | 'flagged'
): Promise<{ success: boolean }> {
    const { error } = await supabase
        .from('reviews')
        .update({
            status,
            moderated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) throw new Error(error.message)
    return { success: true }
}


// ============================================
// NATIONALITIES API
// ============================================

export async function fetchNationalities() {
    const { data, error } = await supabase
        .from('nationalities')
        .select('*')
        .eq('is_active', true)
        .order('name')

    if (error) throw new Error(error.message)
    return data || []
}

// ============================================
// STATISTICS API
// ============================================

export async function fetchStatistics(): Promise<Statistics> {
    // Get total attractions
    const { count: totalAttractions } = await supabase
        .from('attractions')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_active', true)

    // Get total reviews (approved only)
    const { count: totalReviews } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('status', 'approved')

    // Get total itineraries
    const { count: totalItineraries } = await supabase
        .from('itineraries')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_active', true)

    // Get average rating
    const { data: ratingData } = await supabase
        .from('attractions')
        .select('avg_rating')
        .is('deleted_at', null)
        .eq('is_active', true)

    const averageRating = ratingData && ratingData.length > 0
        ? ratingData.reduce((sum, a) => sum + (a.avg_rating || 0), 0) / ratingData.length
        : 0

    return {
        total_attractions: totalAttractions || 0,
        total_reviews: totalReviews || 0,
        total_itineraries: totalItineraries || 0,
        average_rating: Math.round(averageRating * 100) / 100,
    }
}