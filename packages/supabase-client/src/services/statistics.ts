/**
 * Statistics Service
 * Aggregate statistics for admin dashboard
 */

import { supabase } from '../client';
import type { Statistics } from '../types';

/**
 * Get dashboard statistics
 */
export async function getStatistics(): Promise<{ data: Statistics | null; error: Error | null }> {
    try {
        // Get total attractions
        const { count: totalAttractions, error: attractionsError } = await supabase
            .from('attractions')
            .select('*', { count: 'exact', head: true })
            .is('deleted_at', null)
            .eq('is_active', true);

        if (attractionsError) throw attractionsError;

        // Get total reviews (approved only)
        const { count: totalReviews, error: reviewsError } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .is('deleted_at', null)
            .eq('status', 'approved');

        if (reviewsError) throw reviewsError;

        // Get total itineraries
        const { count: totalItineraries, error: itinerariesError } = await supabase
            .from('itineraries')
            .select('*', { count: 'exact', head: true })
            .is('deleted_at', null)
            .eq('is_active', true);

        if (itinerariesError) throw itinerariesError;

        // Get average rating across all attractions
        const { data: ratingData, error: ratingError } = await supabase
            .from('attractions')
            .select('avg_rating')
            .is('deleted_at', null)
            .eq('is_active', true);

        if (ratingError) throw ratingError;

        const averageRating = ratingData && ratingData.length > 0
            ? ratingData.reduce((sum, a) => sum + (a.avg_rating || 0), 0) / ratingData.length
            : 0;

        return {
            data: {
                total_attractions: totalAttractions || 0,
                total_reviews: totalReviews || 0,
                total_itineraries: totalItineraries || 0,
                average_rating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
            },
            error: null,
        };
    } catch (error) {
        return {
            data: null,
            error: error as Error,
        };
    }
}

/**
 * Get review statistics by status
 */
export async function getReviewStats() {
    const statuses = ['pending', 'approved', 'rejected', 'flagged'];
    const stats: Record<string, number> = {};

    for (const status of statuses) {
        const { count, error } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .is('deleted_at', null)
            .eq('status', status);

        if (!error) {
            stats[status] = count || 0;
        }
    }

    return { data: stats, error: null };
}

/**
 * Get itinerary statistics
 */
export async function getItineraryStats() {
    const { count: publicCount } = await supabase
        .from('itineraries')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_active', true)
        .eq('is_public', true);

    const { count: privateCount } = await supabase
        .from('itineraries')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_active', true)
        .eq('is_public', false);

    const { count: featuredCount } = await supabase
        .from('itineraries')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_active', true)
        .eq('is_featured', true);

    return {
        data: {
            public: publicCount || 0,
            private: privateCount || 0,
            featured: featuredCount || 0,
        },
        error: null,
    };
}
