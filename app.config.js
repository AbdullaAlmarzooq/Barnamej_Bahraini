const fs = require('fs');
const path = require('path');

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const parsed = {};

  for (const rawLine of fileContents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
};

const rootDir = __dirname;
const fileEnv = Object.assign(
  {},
  parseEnvFile(path.join(rootDir, '.env')),
  parseEnvFile(path.join(rootDir, '.env.local')),
  parseEnvFile(path.join(rootDir, 'apps/admin-dashboard/.env')),
  parseEnvFile(path.join(rootDir, 'apps/admin-dashboard/.env.local'))
);

const getEnvValue = (...keys) => {
  for (const key of keys) {
    const value = process.env[key] || fileEnv[key];
    if (value) {
      return value;
    }
  }

  return '';
};

const supabaseUrl = getEnvValue(
  'EXPO_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
  'VITE_SUPABASE_URL'
);

const supabaseAnonKey = getEnvValue(
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY'
);

if (!process.env.EXPO_PUBLIC_SUPABASE_URL && supabaseUrl) {
  process.env.EXPO_PUBLIC_SUPABASE_URL = supabaseUrl;
}

if (supabaseAnonKey) {
  if (!process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY && supabaseAnonKey.startsWith('sb_publishable_')) {
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = supabaseAnonKey;
  }

  if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && !supabaseAnonKey.startsWith('sb_publishable_')) {
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey;
  }
}

module.exports = {
  expo: {
    name: 'Barnamej_Bahraini',
    slug: 'Barnamej_Bahraini',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/adaptive-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-font', 'expo-asset', 'expo-secure-store'],
    extra: {
      supabaseUrl,
      supabaseAnonKey,
    },
  },
};
