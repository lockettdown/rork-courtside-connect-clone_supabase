import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const isValidUrl = (url: string | undefined): boolean => {
  if (!url || url.length === 0) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.includes('supabase');
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl) && supabaseAnonKey.length > 10);

if (!isSupabaseConfigured) {
  console.log('Supabase not configured - app will run in demo mode');
}

const storage = Platform.OS === 'web' 
  ? {
      getItem: async (key: string) => {
        if (typeof window !== 'undefined') {
          return window.localStorage.getItem(key);
        }
        return null;
      },
      setItem: async (key: string, value: string) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
      },
      removeItem: async (key: string) => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
      },
    }
  : AsyncStorage;

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl! : PLACEHOLDER_URL,
  isSupabaseConfigured ? supabaseAnonKey! : PLACEHOLDER_KEY,
  {
    auth: {
      storage,
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: false,
    },
    global: {
      fetch: isSupabaseConfigured ? undefined : (async (_url: RequestInfo | URL, _init?: RequestInit) => {
        return new Response(JSON.stringify({ message: 'Demo mode' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    },
  }
);
