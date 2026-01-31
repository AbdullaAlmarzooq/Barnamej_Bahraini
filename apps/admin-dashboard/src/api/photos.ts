import { supabase } from './client'
import type { AttractionPhoto } from '../types'

const BUCKET = 'attraction-images'

// ================================
// GET PHOTOS
// ================================
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

// ================================
// UPLOAD + CREATE DB RECORD
// ================================
export async function uploadAttractionPhoto(
  attractionId: string,
  file: File
) {

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("User not authenticated");
  const fileExt = file.name.split('.').pop();
  const filePath = `attractions/${attractionId}/${Date.now()}.${fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from('attraction-images')
    .upload(filePath, file);

  if (uploadError) throw uploadError;
  const { data, error } = await supabase
    .from('attraction_photos')
    .insert({
      attraction_id: attractionId,
      storage_path: filePath,
      storage_bucket: 'attraction-images',
      uploaded_by: user.id,
      is_active: true,
      is_primary: false
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

// ================================
// DELETE PHOTO (STORAGE + DB)
// ================================
export async function deleteAttractionPhoto(photoId: string) {
  const { data: photo } = await supabase
    .from('attraction_photos')
    .select('storage_path, storage_bucket')
    .eq('id', photoId)
    .single()

  if (photo?.storage_path) {
    await supabase.storage
      .from(photo.storage_bucket || BUCKET)
      .remove([photo.storage_path])
  }

  const { error } = await supabase
    .from('attraction_photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', photoId)

  if (error) throw new Error(error.message)
}

// ================================
// SET PRIMARY
// ================================
export async function setPrimaryPhoto(photoId: string) {
  const { data: photo, error: fetchError } = await supabase
    .from('attraction_photos')
    .select('attraction_id')
    .eq('id', photoId)
    .single()

  if (fetchError) throw new Error(fetchError.message)

  await supabase
    .from('attraction_photos')
    .update({ is_primary: false })
    .eq('attraction_id', photo.attraction_id)

  const { error } = await supabase
    .from('attraction_photos')
    .update({ is_primary: true })
    .eq('id', photoId)

  if (error) throw new Error(error.message)
}

// ================================
// PUBLIC URL
// ================================
export function getPhotoUrl(path: string, bucket = BUCKET) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
