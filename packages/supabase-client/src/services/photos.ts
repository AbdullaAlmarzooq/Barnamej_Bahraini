/**
 * Photos Service
 * CRUD operations for attraction_photos table using Supabase
 */

import { supabase } from '../client';
import type { AttractionPhoto, AttractionPhotoInput } from '../types';

/**
 * Get all photos for an attraction
 */
export async function getPhotosForAttraction(attractionId: string) {
    const { data, error } = await supabase
        .from('attraction_photos')
        .select('*')
        .eq('attraction_id', attractionId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('display_order');

    return { data: data as AttractionPhoto[] | null, error };
}

/**
 * Get primary photo for an attraction
 */
export async function getPrimaryPhoto(attractionId: string) {
    const { data, error } = await supabase
        .from('attraction_photos')
        .select('*')
        .eq('attraction_id', attractionId)
        .eq('is_primary', true)
        .is('deleted_at', null)
        .single();

    return { data: data as AttractionPhoto | null, error };
}

/**
 * Get photo by ID
 */
export async function getPhoto(id: string) {
    const { data, error } = await supabase
        .from('attraction_photos')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

    return { data: data as AttractionPhoto | null, error };
}

/**
 * Add a new photo to an attraction
 */
export async function addPhoto(input: Partial<AttractionPhotoInput>) {
    const { data, error } = await supabase
        .from('attraction_photos')
        .insert(input)
        .select()
        .single();

    return { data: data as AttractionPhoto | null, error };
}

/**
 * Update a photo
 */
export async function updatePhoto(id: string, input: Partial<AttractionPhoto>) {
    const { data, error } = await supabase
        .from('attraction_photos')
        .update(input)
        .eq('id', id)
        .select()
        .single();

    return { data: data as AttractionPhoto | null, error };
}

/**
 * Set a photo as primary (unsets other primary photos for same attraction)
 */
export async function setPrimaryPhoto(photoId: string) {
    // First, get the photo to find its attraction_id
    const { data: photo, error: fetchError } = await getPhoto(photoId);

    if (fetchError || !photo) {
        return { data: null, error: fetchError || new Error('Photo not found') };
    }

    // Unset all primary photos for this attraction
    await supabase
        .from('attraction_photos')
        .update({ is_primary: false })
        .eq('attraction_id', photo.attraction_id)
        .is('deleted_at', null);

    // Set the new primary photo
    const { data, error } = await supabase
        .from('attraction_photos')
        .update({ is_primary: true })
        .eq('id', photoId)
        .select()
        .single();

    return { data: data as AttractionPhoto | null, error };
}

/**
 * Soft delete a photo
 */
export async function deletePhoto(id: string) {
    const { data, error } = await supabase
        .from('attraction_photos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    return { data: data as AttractionPhoto | null, error };
}

/**
 * Reorder photos for an attraction
 */
export async function reorderPhotos(attractionId: string, orderedIds: string[]) {
    const updates = orderedIds.map((id, index) => ({
        id,
        display_order: index,
    }));

    const { error } = await supabase
        .from('attraction_photos')
        .upsert(updates, { onConflict: 'id' });

    return { success: !error, error };
}

/**
 * Get public URL for a photo from Supabase Storage
 */
export function getPhotoPublicUrl(storagePath: string, bucket = 'attraction-images') {
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return data.publicUrl;
}
