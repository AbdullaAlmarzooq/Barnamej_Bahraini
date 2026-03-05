/**
 * React Native / Expo Supabase client entry point
 * This includes the URL polyfill needed for React Native
 */

import 'react-native-url-polyfill/auto'
import { initSupabase } from './client'

// Initialize with Expo environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    ''

if (supabaseUrl && supabaseKey) {
    initSupabase(supabaseUrl, supabaseKey)
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
