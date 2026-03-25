import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as SecureStore from 'expo-secure-store';
import { initSupabase } from '@barnamej/supabase-client';
import { AuthProvider } from './src/context/AuthContext';
import { getMissingSupabaseVars, hasSupabaseConfig, runtimeEnv } from './src/config/runtimeEnv';

if (hasSupabaseConfig) {
  initSupabase(runtimeEnv.supabaseUrl, runtimeEnv.supabaseAnonKey, {
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
  if (!hasSupabaseConfig) {
    const missingVars = getMissingSupabaseVars().join(', ');

    return (
      <SafeAreaProvider>
        <View style={styles.errorScreen}>
          <Text style={styles.errorTitle}>Supabase configuration is missing</Text>
          <Text style={styles.errorBody}>
            Add the missing values to the root `.env` file, then restart Expo.
          </Text>
          <Text style={styles.errorCode}>{missingVars}</Text>
          <Text style={styles.errorHint}>
            `SUPABASE_URL` and `SUPABASE_ANON_KEY` are also supported through Expo config.
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    backgroundColor: '#FFF8F6',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7A1C14',
    marginBottom: 12,
  },
  errorBody: {
    fontSize: 16,
    lineHeight: 24,
    color: '#3D251F',
    marginBottom: 12,
  },
  errorCode: {
    fontSize: 15,
    lineHeight: 22,
    color: '#B42318',
    marginBottom: 12,
  },
  errorHint: {
    fontSize: 14,
    lineHeight: 21,
    color: '#69412F',
  },
});
