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

export async function updateAttraction(id: string, input: Partial<Attraction>): Promise<{ success: boolean }> {
    const { error } = await supabase
        .from('attractions')
        .update(input)
        .eq('id', id)

    if (error) throw new Error(error.message)
    return { success: true }
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
// ATTRACTION PHOTOS API
// ============================================

export async function fetchAttractionPhotos(attractionId: string): Promise<AttractionPhoto[]> {
    const { data, error } = await supabase
        .from('attraction_photos')
        .select('*')
        .eq('attraction_id', attractionId)
        .is('deleted_at', null)
        .order('display_order')

    if (error) throw new Error(error.message)
    return data || []
}

export async function addAttractionPhoto(attractionId: string, storagePath: string): Promise<AttractionPhoto> {
    const { data, error } = await supabase
        .from('attraction_photos')
        .insert({
            attraction_id: attractionId,
            storage_path: storagePath,
            storage_bucket: 'attraction-images',
        })
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data
}

export async function deleteAttractionPhoto(photoId: string): Promise<{ success: boolean }> {
    // Soft delete
    const { error } = await supabase
        .from('attraction_photos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', photoId)

    if (error) throw new Error(error.message)
    return { success: true }
}

export async function setPrimaryPhoto(photoId: string): Promise<{ success: boolean }> {
    // First get the photo to find its attraction_id
    const { data: photo, error: fetchError } = await supabase
        .from('attraction_photos')
        .select('attraction_id')
        .eq('id', photoId)
        .single()

    if (fetchError) throw new Error(fetchError.message)

    // Unset all primary photos for this attraction
    await supabase
        .from('attraction_photos')
        .update({ is_primary: false })
        .eq('attraction_id', photo.attraction_id)

    // Set the new primary photo
    const { error } = await supabase
        .from('attraction_photos')
        .update({ is_primary: true })
        .eq('id', photoId)

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
// ITINERARIES API
// ============================================

export async function fetchItineraries(filter: 'all' | 'public' | 'private' = 'all'): Promise<Itinerary[]> {
    let query = supabase
        .from('itineraries')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

    if (filter === 'public') {
        query = query.eq('is_public', true)
    } else if (filter === 'private') {
        query = query.eq('is_public', false)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
}

export async function fetchItinerary(id: string): Promise<Itinerary> {
    const { data, error } = await supabase
        .from('itineraries')
        .select(`
      *,
      attractions:itinerary_attractions(
        *,
        attraction:attractions(*)
      )
    `)
        .eq('id', id)
        .is('deleted_at', null)
        .single()

    if (error) throw new Error(error.message)

    // Filter and sort attractions
    if (data && data.attractions) {
        data.attractions = data.attractions
            .filter((ia: ItineraryAttraction) => ia.deleted_at === null)
            .sort((a: ItineraryAttraction, b: ItineraryAttraction) => a.position - b.position)
    }

    return data
}

export async function createItinerary(input: Partial<Itinerary>): Promise<{ id: string }> {
    const { data, error } = await supabase
        .from('itineraries')
        .insert({
            ...input,
            is_public: input.is_public ?? false,
            is_active: true,
        })
        .select('id')
        .single()

    if (error) throw new Error(error.message)
    return { id: data.id }
}

export async function updateItinerary(id: string, input: Partial<Itinerary>): Promise<{ success: boolean }> {
    const { error } = await supabase
        .from('itineraries')
        .update(input)
        .eq('id', id)

    if (error) throw new Error(error.message)
    return { success: true }
}

export async function deleteItinerary(id: string): Promise<{ success: boolean }> {
    // Soft delete
    const { error } = await supabase
        .from('itineraries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw new Error(error.message)
    return { success: true }
}

export async function addItineraryAttraction(
    itineraryId: string,
    attractionId: string
): Promise<{ success: boolean }> {
    // Get next position
    const { data: existing } = await supabase
        .from('itinerary_attractions')
        .select('position')
        .eq('itinerary_id', itineraryId)
        .is('deleted_at', null)
        .order('position', { ascending: false })
        .limit(1)

    const nextPosition = existing && existing.length > 0
        ? existing[0].position + 1
        : 0

    const { error } = await supabase
        .from('itinerary_attractions')
        .insert({
            itinerary_id: itineraryId,
            attraction_id: attractionId,
            position: nextPosition,
        })

    if (error) throw new Error(error.message)
    return { success: true }
}

export async function updateItineraryAttraction(
    linkId: string,
    data: Partial<ItineraryAttraction>
): Promise<{ success: boolean }> {
    const { error } = await supabase
        .from('itinerary_attractions')
        .update(data)
        .eq('id', linkId)

    if (error) throw new Error(error.message)
    return { success: true }
}

export async function removeItineraryAttraction(
    itineraryId: string,
    attractionId: string
): Promise<{ success: boolean }> {
    // Soft delete
    const { error } = await supabase
        .from('itinerary_attractions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('itinerary_id', itineraryId)
        .eq('attraction_id', attractionId)

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

// ============================================
// STORAGE HELPERS
// ============================================

export function getPhotoUrl(storagePath: string, bucket = 'attraction-images'): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath)
    return data.publicUrl
}
