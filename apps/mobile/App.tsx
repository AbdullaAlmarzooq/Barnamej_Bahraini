import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as SecureStore from 'expo-secure-store';
import { initSupabase } from '@barnamej/supabase-client';
import { AuthProvider } from './src/context/AuthContext';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (supabaseUrl && supabaseKey) {
  initSupabase(supabaseUrl, supabaseKey, {
    auth: {
      storage: {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      },
      detectSessionInUrl: false,
    },
  });
}

export default function App() {
  return (
    <SafeAreaProvider>
      {/* <StatusBar style="auto" /> */}
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
