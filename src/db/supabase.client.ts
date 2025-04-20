// src/db/supabase.client.ts
// Import createClient and the base SupabaseClient type from the library
import { createClient, type SupabaseClient as SupabaseClientBase } from "@supabase/supabase-js";

// Import your local Database type
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

// --- Static User ID for MVP ---
// IMPORTANT: Replace with the actual UUID of the user you want to use for testing.
// This user should exist in your Supabase auth.users and public.users tables.
export const DEFAULT_USER_ID = "9575a8e6-4160-45f5-93bd-0ff215ae4c83";

// Export the Supabase client instance (lowercase)
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

// Export the SupabaseClient type alias, parameterized with your Database type
// This uses the imported base type 'SupabaseClientBase'
export type SupabaseClient = SupabaseClientBase<Database>;
