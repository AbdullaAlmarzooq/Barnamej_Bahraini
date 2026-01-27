/**
 * Reviews API - Sync reviews to Supabase
 */

// Import from the packages directory using relative path
import { supabase } from '../../../../packages/supabase-client/src'

export interface ReviewPayload {
    attraction_id: string
    reviewer_name?: string
    comment?: string
    price_rating: number
    cleanliness_rating: number
    service_rating: number
    experience_rating: number
    age?: number
    nationality_id?: string
}

/**
 * Post a review to Supabase
 * Returns success status for the sync queue
 */
export const postReview = async (payload: ReviewPayload): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('reviews')
            .insert({
                attraction_id: payload.attraction_id,
                reviewer_name: payload.reviewer_name || null,
                comment: payload.comment || null,
                price_rating: payload.price_rating,
                cleanliness_rating: payload.cleanliness_rating,
                service_rating: payload.service_rating,
                experience_rating: payload.experience_rating,
                age: payload.age || null,
                nationality_id: payload.nationality_id || null,
                status: 'pending', // Reviews start as pending for moderation
            })

        if (error) {
            console.error('[API] Error posting review:', error.message)
            return { success: false, error: error.message }
        }

        console.log('[API] Review posted successfully')
        return { success: true }
    } catch (err: any) {
        console.error('[API] Exception posting review:', err.message)
        return { success: false, error: err.message }
    }
}
