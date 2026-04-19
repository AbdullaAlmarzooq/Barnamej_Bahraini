/**
 * Reviews Service
 * CRUD operations for reviews table using Supabase
 */

import { supabase } from '../client';
import type { Review, ReviewInput, ReviewStatus, ReviewWithAttraction, ReviewWithNationality } from '../types';
import { calculateAgeFromBirthdate, getUserTimeZone } from '../utils/age';

/**
 * Get all approved reviews (for public display)
 */
export async function getApprovedReviews() {
    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .is('deleted_at', null)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

    return { data: data as Review[] | null, error };
}

/**
 * Get reviews for a specific attraction (approved only)
 */
export async function getReviewsForAttraction(attractionId: string) {
    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('attraction_id', attractionId)
        .is('deleted_at', null)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

    return { data: data as Review[] | null, error };
}

/**
 * Get all reviews with attraction names (Admin)
 */
export async function getAllReviews() {
    const { data, error } = await supabase
        .from('reviews')
        .select(`
      *,
      attraction:attractions(id, name)
    `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    return { data: data as ReviewWithAttraction[] | null, error };
}

/**
 * Get reviews by status (Admin)
 */
export async function getReviewsByStatus(status: string) {
    const { data, error } = await supabase
        .from('reviews')
        .select(`
      *,
      attraction:attractions(id, name)
    `)
        .is('deleted_at', null)
        .eq('status', status)
        .order('created_at', { ascending: false });

    return { data: data as ReviewWithAttraction[] | null, error };
}

/**
 * Get review by ID
 */
export async function getReview(id: string) {
    const { data, error } = await supabase
        .from('reviews')
        .select(`
      *,
      nationality:nationalities(id, name)
    `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

    return { data: data as ReviewWithNationality | null, error };
}

/**
 * Create a new review (status defaults to 'pending')
 */
export async function createReview(input: ReviewInput, statusOverride?: ReviewStatus) {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    let computedAge = input.age ?? null;
    let computedNationalityId = input.nationality_id ?? null;
    let existingProfileNationalityId: string | null = null;
    const metadataBirthdate = typeof user?.user_metadata?.birthdate === 'string'
        ? user.user_metadata.birthdate
        : null;
    const metadataNationalityId = typeof user?.user_metadata?.nationality_id === 'string'
        ? user.user_metadata.nationality_id
        : null;

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('birthdate, nationality_id')
            .eq('id', user.id)
            .maybeSingle();

        existingProfileNationalityId = profile?.nationality_id ?? metadataNationalityId ?? null;

        if (computedAge == null) {
            const profileBirthdate = profile?.birthdate ?? metadataBirthdate;
            if (profileBirthdate) {
                computedAge = calculateAgeFromBirthdate(profileBirthdate, getUserTimeZone());
            }
        }

        if (computedNationalityId == null) {
            computedNationalityId = existingProfileNationalityId;
        }

        if (computedNationalityId && !existingProfileNationalityId) {
            const { error: profileUpsertError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email ?? null,
                    nationality_id: computedNationalityId,
                    updated_at: new Date().toISOString(),
                });

            if (profileUpsertError) {
                console.error('[Reviews] Failed to persist nationality to profile:', profileUpsertError);
            }
        }
    }

    const { data, error } = await supabase
        .from('reviews')
        .insert({
            ...input,
            age: computedAge,
            nationality_id: computedNationalityId,
            user_id: input.user_id ?? user?.id ?? null,
            status: statusOverride || 'pending',
        })
        .select()
        .single();

    return { data: data as Review | null, error };
}

/**
 * Update review status (Admin moderation)
 */
export async function moderateReview(
    id: string,
    status: 'approved' | 'rejected' | 'flagged',
    moderationNotes?: string,
    moderatedBy?: string
) {
    const { data, error } = await supabase
        .from('reviews')
        .update({
            status,
            moderation_notes: moderationNotes,
            moderated_by: moderatedBy,
            moderated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    return { data: data as Review | null, error };
}

/**
 * Soft delete a review
 */
export async function deleteReview(id: string) {
    const { data, error } = await supabase
        .from('reviews')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    return { data: data as Review | null, error };
}

/**
 * Increment helpful count for a review
 */
export async function markReviewHelpful(id: string) {
    const { data, error } = await supabase
        .rpc('increment_helpful_count', { review_id: id });

    return { data, error };
}
