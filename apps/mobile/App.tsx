import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/database';

import HomeScreen from './src/screens/HomeScreen';

export default function App() {
  const [isDbInitialized, setIsDbInitialized] = useState(false);

  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase();
      } catch (e) {
        console.error("Database initialization failed:", e);
      } finally {
        setIsDbInitialized(true);
      }
    };
    setup();
  }, []);

  if (!isDbInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#D71A28" />
        <Text style={{ marginTop: 20, fontSize: 16, color: '#333' }}>Loading Bahrain's Hidden Gems...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {/* <StatusBar style="auto" /> */}
      <AppNavigator />
    </SafeAreaProvider>
  );
}
