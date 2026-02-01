import { supabase } from './client';
import type { Itinerary, ItineraryAttraction } from '../types';

// Fetch itineraries
export async function fetchItineraries(filter: 'all' | 'public' | 'private' = 'all'): Promise<Itinerary[]> {
    let query = supabase
        .from('itineraries')
        .select(`
            *,
            creator:profiles!user_id(id, full_name, email)
        `)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (filter === 'public') query = query.eq('is_public', true);
    else if (filter === 'private') query = query.eq('is_public', false);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}


// Fetch single itinerary with attractions
export async function fetchItinerary(id: string): Promise<Itinerary> {
    const { data, error } = await supabase
        .from('itineraries')
        .select(`
            *,
            creator:profiles!user_id(id, full_name, email),
            attractions:itinerary_attractions(
                *,
                attraction:attractions(*)
            )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

    if (error) throw new Error(error.message);

    if (data?.attractions) {
        data.attractions = data.attractions
            .filter((ia: ItineraryAttraction) => ia.deleted_at === null)
            .sort((a: ItineraryAttraction, b: ItineraryAttraction) => a.position - b.position);
    }

    return data;
}


// Create itinerary and automatically set user_id and creator_name
export async function createItinerary(input: Partial<Itinerary>, userId: string, creatorName?: string): Promise<{ id: string }> {
    const { data, error } = await supabase
        .from('itineraries')
        .insert({
            ...input,
            user_id: userId,  // <- correct column name is user_id, not creator_id
            creator_name: creatorName || input.creator_name, // <- store the creator's name
            is_public: input.is_public ?? false,
            is_active: true,
        })
        .select('id')
        .single();

    if (error) throw new Error(error.message);
    return { id: data.id };
}

// Update itinerary
export async function updateItinerary(id: string, input: Partial<Itinerary>): Promise<{ success: boolean }> {
    const { error } = await supabase.from('itineraries').update(input).eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
}

// Soft delete itinerary
export async function deleteItinerary(id: string): Promise<{ success: boolean }> {
    const { error } = await supabase
        .from('itineraries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
}


export async function addItineraryAttraction(
    itineraryId: string,
    attractionId: string,
    scheduledStartTime?: string,
    scheduledEndTime?: string
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
            scheduled_start_time: scheduledStartTime,
            scheduled_end_time: scheduledEndTime
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