/**
 * Browser-compatible Supabase client
 * Use this for web applications (admin dashboard)
 */

import { createClient } from '@supabase/supabase-js'
import { initSupabase } from './client'

// For Vite, use import.meta.env
declare const import_meta_env: {
    VITE_SUPABASE_URL?: string
    VITE_SUPABASE_ANON_KEY?: string
}

// Get environment variables with fallbacks
function getEnvVar(viteKey: string): string {
    // Try Vite's import.meta.env first
    try {
        // @ts-ignore - Vite injects this at build time
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            return import.meta.env[viteKey] || ''
        }
    } catch {
        // Ignore - not in Vite environment
    }

    // Fallback to process.env
    if (typeof process !== 'undefined' && process.env) {
        return (process.env as Record<string, string | undefined>)[viteKey] || ''
    }

    return ''
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL')
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY')

// Initialize the shared client
if (supabaseUrl && supabaseAnonKey) {
    initSupabase(supabaseUrl, supabaseAnonKey)
}

// Re-export client and supabase for direct access
export { supabase, getSupabase, initSupabase } from './client'

// Re-export types
export * from './types'

// Re-export services
export * from './services/attractions'
export * from './services/photos'
export * from './services/reviews'
export * from './services/itineraries'
export * from './services/nationalities'
export * from './services/statistics'
