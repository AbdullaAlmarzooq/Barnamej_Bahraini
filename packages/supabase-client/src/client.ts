/**
 * Supabase client instance
 * This is the core client used by all services
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Client singleton
let supabaseInstance: SupabaseClient | null = null

/**
 * Get or create the Supabase client instance
 * Supports both React Native (Expo) and browser environments
 */
function getSupabaseConfig(): { url: string; anonKey: string } {
    // React Native / Expo environment
    if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL) {
        return {
            url: process.env.EXPO_PUBLIC_SUPABASE_URL,
            anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        }
    }

    // Vite browser environment
    if (typeof globalThis !== 'undefined' && (globalThis as any).import?.meta?.env?.VITE_SUPABASE_URL) {
        return {
            url: (globalThis as any).import.meta.env.VITE_SUPABASE_URL,
            anonKey: (globalThis as any).import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        }
    }

    // Fallback - will be set by the entry point (index.ts or browser.ts)
    return { url: '', anonKey: '' }
}

/**
 * Initialize the Supabase client with custom config
 * Called by entry points to ensure proper environment variables
 */
export function initSupabase(url: string, anonKey: string): SupabaseClient {
    supabaseInstance = createClient(url, anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    })
    return supabaseInstance
}

/**
 * Get the Supabase client instance
 * Will auto-initialize if not already done
 */
export function getSupabase(): SupabaseClient {
    if (!supabaseInstance) {
        const { url, anonKey } = getSupabaseConfig()
        if (url) {
            supabaseInstance = createClient(url, anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            })
        } else {
            throw new Error('Supabase not initialized. Call initSupabase() first or set environment variables.')
        }
    }
    return supabaseInstance
}

// For backward compatibility, also export as 'supabase'
// This will be a getter that returns the singleton
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        const client = getSupabase()
        const value = (client as any)[prop]
        if (typeof value === 'function') {
            return value.bind(client)
        }
        return value
    }
})
