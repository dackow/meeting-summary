// src/db/supabase.client.ts
// Import the base SupabaseClient type and createServerClient from the library
// FIX: Use @supabase/ssr for the SSR client factory and type alias base as intended for middleware/server routes
// FIX: Import the SupabaseClient type from @supabase/supabase-js instead of @supabase/ssr due to reported error
import { type SupabaseClient as SupabaseClientBase } from "@supabase/supabase-js"; // Changed source from @supabase/ssr
import { createServerClient } from "@supabase/ssr"; // Import the SSR factory

// Import your local Database type
import type { Database } from "./database.types"; // Adjust path as needed

// --- Static User ID for MVP (TEMPORARY INSECURE WORKAROUND) ---
// IMPORTANT: This ID is used in API handlers instead of authenticated user ID
// as per specific MVP rule "Don't use any auth at the moment - use the user defined in the supabase.client.ts".
// This OVERRIDES standard Supabase RLS behavior for API endpoints and is INSECURE for production.
// Replace with the actual UUID of the user you want to use for testing MVP DB interactions.
// This user should exist in your Supabase auth.users and public.users tables.
export const DEFAULT_USER_ID = "9575a8e6-4160-45f5-93bd-0ff215ae4c83"; // !!! REPLACE WITH YOUR DEFAULT USER ID !!!

// Export the SupabaseClient type alias, parameterized with your Database type
// This is the type to use for type hinting the Supabase client instance (both server and browser).
// FIX: This type alias is now the authoritative source for SupabaseClient type in the project
export type SupabaseClient = SupabaseClientBase<Database>;

// Export createServerClient for use in Astro middleware and server code.
// The browser client instance is now exported from src/auth.ts.
export { createServerClient };

// Remove the direct export of `supabaseClient` instance from here, as it's now in `src/auth.ts`
// export const supabaseClient = ... ; // REMOVE THIS
