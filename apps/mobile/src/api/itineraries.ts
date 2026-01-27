/**
 * Itineraries API - Sync itineraries to Supabase
 */

// Import from the packages directory using relative path
import { supabase } from '../../../../packages/supabase-client/src'

export interface ItineraryPayload {
    id?: string // Local ID for reference
    name: string
    description?: string
    is_public?: boolean
    creator_name?: string
    user_id?: string
}

/**
 * Post an itinerary to Supabase
 * Returns success status for the sync queue
 */
export const postItinerary = async (payload: ItineraryPayload): Promise<{ success: boolean; error?: string; id?: string }> => {
    try {
        const { data, error } = await supabase
            .from('itineraries')
            .insert({
                name: payload.name,
                description: payload.description || null,
                is_public: payload.is_public ?? false,
                creator_name: payload.creator_name || null,
                user_id: payload.user_id || null,
                is_active: true,
            })
            .select('id')
            .single()

        if (error) {
            console.error('[API] Error posting itinerary:', error.message)
            return { success: false, error: error.message }
        }

        console.log('[API] Itinerary posted successfully:', data?.id)
        return { success: true, id: data?.id }
    } catch (err: any) {
        console.error('[API] Exception posting itinerary:', err.message)
        return { success: false, error: err.message }
    }
}

/**
 * Update an existing itinerary in Supabase
 */
export const updateItinerary = async (
    id: string,
    payload: Partial<ItineraryPayload>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('itineraries')
            .update({
                name: payload.name,
                description: payload.description,
                is_public: payload.is_public,
                creator_name: payload.creator_name,
            })
            .eq('id', id)

        if (error) {
            console.error('[API] Error updating itinerary:', error.message)
            return { success: false, error: error.message }
        }

        console.log('[API] Itinerary updated successfully:', id)
        return { success: true }
    } catch (err: any) {
        console.error('[API] Exception updating itinerary:', err.message)
        return { success: false, error: err.message }
    }
}

/**
 * Delete an itinerary (soft delete)
 */
export const deleteItinerary = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('itineraries')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)

        if (error) {
            console.error('[API] Error deleting itinerary:', error.message)
            return { success: false, error: error.message }
        }

        console.log('[API] Itinerary deleted successfully:', id)
        return { success: true }
    } catch (err: any) {
        console.error('[API] Exception deleting itinerary:', err.message)
        return { success: false, error: err.message }
    }
}

/**
 * Add attraction to itinerary
 */
export const addAttractionToItinerary = async (
    itineraryId: string,
    attractionId: string,
    position: number
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('itinerary_attractions')
            .insert({
                itinerary_id: itineraryId,
                attraction_id: attractionId,
                position,
            })

        if (error) {
            console.error('[API] Error adding attraction to itinerary:', error.message)
            return { success: false, error: error.message }
        }

        console.log('[API] Attraction added to itinerary successfully')
        return { success: true }
    } catch (err: any) {
        console.error('[API] Exception adding attraction:', err.message)
        return { success: false, error: err.message }
    }
}
