/**
 * Nationalities Service
 * Read operations for nationalities reference table using Supabase
 */

import { supabase } from '../client';
import type { Nationality } from '../types';

/**
 * Get all active nationalities
 */
export async function getNationalities() {
    const { data, error } = await supabase
        .from('nationalities')
        .select('*')
        .eq('is_active', true)
        .order('name');

    return { data: data as Nationality[] | null, error };
}

/**
 * Get nationality by ID
 */
export async function getNationality(id: string) {
    const { data, error } = await supabase
        .from('nationalities')
        .select('*')
        .eq('id', id)
        .single();

    return { data: data as Nationality | null, error };
}

/**
 * Get nationality by code (ISO 3166-1 alpha-3)
 */
export async function getNationalityByCode(code: string) {
    const { data, error } = await supabase
        .from('nationalities')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

    return { data: data as Nationality | null, error };
}
