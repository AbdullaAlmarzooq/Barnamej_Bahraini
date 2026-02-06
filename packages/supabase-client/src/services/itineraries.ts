/**
 * Itineraries Service
 * CRUD operations for itineraries and itinerary_attractions tables using Supabase
 */

import { supabase } from '../client';
import type {
    Itinerary,
    ItineraryInput,
    ItineraryAttraction,
    ItineraryAttractionInput,
    ItineraryWithAttractions
} from '../types';

/**
 * Get all itineraries (optionally filter by public/private)
 */
export async function getItineraries(filter?: 'all' | 'public' | 'private') {
    let query = supabase
        .from('itineraries')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (filter === 'public') {
        query = query.eq('is_public', true);
    } else if (filter === 'private') {
        query = query.eq('is_public', false);
    }

    const { data, error } = await query;

    return { data: data as Itinerary[] | null, error };
}

/**
 * Get featured itineraries
 */
export async function getFeaturedItineraries(limit = 5) {
    const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(limit);

    return { data: data as Itinerary[] | null, error };
}

/**
 * Get itineraries for a specific user
 */
export async function getUserItineraries(userId: string) {
    const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    return { data: data as Itinerary[] | null, error };
}

/**
 * Get itinerary by ID
 */
export async function getItinerary(id: string) {
    const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

    return { data: data as Itinerary | null, error };
}

/**
 * Get itinerary with all attractions
 */
export async function getItineraryWithAttractions(id: string) {
    const { data, error } = await supabase
        .from('itineraries')
        .select(`
      *,
      attractions:itinerary_attractions(
        *,
        attraction:attractions_with_photo(*)
      )
    `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

    if (data) {
        // Filter out deleted attraction links and sort by position
        data.attractions = (data.attractions || [])
            .filter((ia: { deleted_at: string | null }) => ia.deleted_at === null)
            .sort((a: { position: number }, b: { position: number }) => a.position - b.position);
    }

    return { data: data as ItineraryWithAttractions | null, error };
}

/**
 * Create a new itinerary
 */
export async function createItinerary(input: ItineraryInput) {
    const { data, error } = await supabase
        .from('itineraries')
        .insert({
            ...input,
            is_public: input.is_public ?? false,
            is_active: true,
        })
        .select()
        .single();

    return { data: data as Itinerary | null, error };
}

/**
 * Update an itinerary
 */
export async function updateItinerary(id: string, input: Partial<Itinerary>) {
    const { data, error } = await supabase
        .from('itineraries')
        .update(input)
        .eq('id', id)
        .select()
        .single();

    return { data: data as Itinerary | null, error };
}

/**
 * Toggle auto-sort for an itinerary
 */
export async function toggleAutoSort(id: string, enabled: boolean) {
    const { data, error } = await supabase
        .from('itineraries')
        .update({ auto_sort_enabled: enabled })
        .eq('id', id)
        .select()
        .single();

    return { data: data as Itinerary | null, error };
}

/**
 * Soft delete an itinerary
 */
export async function deleteItinerary(id: string) {
    const { data, error } = await supabase
        .from('itineraries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    return { data: data as Itinerary | null, error };
}

// ============================================
// ITINERARY ATTRACTIONS
// ============================================

/**
 * Add an attraction to an itinerary
 */
export async function addAttractionToItinerary(
    input: Omit<ItineraryAttractionInput, 'position'> & { position?: number }
) {
    // Get the next position
    const { data: existing } = await supabase
        .from('itinerary_attractions')
        .select('position')
        .eq('itinerary_id', input.itinerary_id)
        .is('deleted_at', null)
        .order('position', { ascending: false })
        .limit(1);

    const nextPosition = existing && existing.length > 0
        ? existing[0].position + 1
        : 0;

    const { data, error } = await supabase
        .from('itinerary_attractions')
        .insert({
            ...input,
            position: input.position ?? nextPosition,
        })
        .select()
        .single();

    return { data: data as ItineraryAttraction | null, error };
}

/**
 * Update an itinerary attraction (times, notes, custom price)
 */
export async function updateItineraryAttraction(
    id: string,
    input: Partial<Pick<ItineraryAttraction, 'scheduled_start_time' | 'scheduled_end_time' | 'custom_price' | 'notes'>>
) {
    const { data, error } = await supabase
        .from('itinerary_attractions')
        .update(input)
        .eq('id', id)
        .select()
        .single();

    return { data: data as ItineraryAttraction | null, error };
}

/**
 * Reorder attractions in an itinerary
 */
export async function reorderItineraryAttractions(itineraryId: string, orderedIds: string[]) {
    // Check if itinerary is public (reordering disabled for public)
    const { data: itinerary } = await getItinerary(itineraryId);

    const mode = (itinerary as any)?.mode ?? (itinerary as any)?.itinerary_mode;
    const isAuto = mode === 'auto';

    if (itinerary?.is_public) {
        return { success: false, error: new Error('Cannot reorder a public itinerary') };
    }
    if (isAuto) {
        return { success: false, error: new Error('Cannot reorder an auto itinerary') };
    }

    try {
        // Phase 1: move to temporary positions to avoid unique constraint conflicts
        for (let i = 0; i < orderedIds.length; i += 1) {
            const id = orderedIds[i];
            const { error } = await supabase
                .from('itinerary_attractions')
                .update({ position: i + 10000 })
                .eq('id', id);
            if (error) throw error;
        }

        // Phase 2: set final positions
        for (let i = 0; i < orderedIds.length; i += 1) {
            const id = orderedIds[i];
            const { error } = await supabase
                .from('itinerary_attractions')
                .update({ position: i })
                .eq('id', id);
            if (error) throw error;
        }

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error };
    }
}

/**
 * Remove an attraction from an itinerary (soft delete)
 */
export async function removeAttractionFromItinerary(itineraryId: string, attractionId: string) {
    const { data, error } = await supabase
        .from('itinerary_attractions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('itinerary_id', itineraryId)
        .eq('attraction_id', attractionId)
        .select()
        .single();

    return { data: data as ItineraryAttraction | null, error };
}

/**
 * Remove an attraction from an itinerary by link ID (soft delete)
 */
export async function removeItineraryAttractionById(id: string) {
    const { data, error } = await supabase
        .from('itinerary_attractions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    return { data: data as ItineraryAttraction | null, error };
}
