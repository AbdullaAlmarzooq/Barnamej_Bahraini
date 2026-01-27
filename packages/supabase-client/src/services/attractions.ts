/**
 * Attractions Service
 * CRUD operations for attractions table using Supabase
 */

import { supabase } from '../client';
import type {
    Attraction,
    AttractionInput,
    AttractionWithPhoto,
    AttractionWithPhotos
} from '../types';

/**
 * Get all active attractions (excludes soft-deleted)
 */
export async function getAttractions() {
    const { data, error } = await supabase
        .from('attractions')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name');

    return { data: data as Attraction[] | null, error };
}

/**
 * Get featured attractions
 */
export async function getFeaturedAttractions(limit = 5) {
    const { data, error } = await supabase
        .from('attractions')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('avg_rating', { ascending: false })
        .limit(limit);

    return { data: data as Attraction[] | null, error };
}

/**
 * Get attraction by ID
 */
export async function getAttraction(id: string) {
    const { data, error } = await supabase
        .from('attractions')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

    return { data: data as Attraction | null, error };
}

/**
 * Get attraction with primary photo
 */
export async function getAttractionWithPhoto(id: string) {
    const { data, error } = await supabase
        .from('attractions_with_photo')
        .select('*')
        .eq('id', id)
        .single();

    return { data: data as AttractionWithPhoto | null, error };
}

/**
 * Get attraction with all photos
 */
export async function getAttractionWithPhotos(id: string) {
    const { data, error } = await supabase
        .from('attractions')
        .select(`
      *,
      photos:attraction_photos(*)
    `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

    if (data) {
        // Filter out deleted photos
        data.photos = (data.photos || []).filter(
            (p: { deleted_at: string | null }) => p.deleted_at === null
        );
    }

    return { data: data as AttractionWithPhotos | null, error };
}

/**
 * Search attractions by name, description, or location
 */
export async function searchAttractions(query: string) {
    const { data, error } = await supabase
        .from('attractions')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
        .order('avg_rating', { ascending: false });

    return { data: data as Attraction[] | null, error };
}

/**
 * Get attractions by category
 */
export async function getAttractionsByCategory(category: string) {
    const { data, error } = await supabase
        .from('attractions')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .eq('category', category)
        .order('avg_rating', { ascending: false });

    return { data: data as Attraction[] | null, error };
}

/**
 * Create a new attraction (Admin only)
 */
export async function createAttraction(input: Partial<AttractionInput>) {
    const { data, error } = await supabase
        .from('attractions')
        .insert(input)
        .select()
        .single();

    return { data: data as Attraction | null, error };
}

/**
 * Update an attraction (Admin only)
 */
export async function updateAttraction(id: string, input: Partial<Attraction>) {
    const { data, error } = await supabase
        .from('attractions')
        .update(input)
        .eq('id', id)
        .select()
        .single();

    return { data: data as Attraction | null, error };
}

/**
 * Soft delete an attraction (Admin only)
 */
export async function deleteAttraction(id: string) {
    const { data, error } = await supabase
        .from('attractions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    return { data: data as Attraction | null, error };
}

/**
 * Hard delete an attraction (Admin only - use with caution)
 */
export async function hardDeleteAttraction(id: string) {
    const { error } = await supabase
        .from('attractions')
        .delete()
        .eq('id', id);

    return { success: !error, error };
}
