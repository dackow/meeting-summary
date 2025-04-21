/* eslint-disable no-console */
// src/auth.ts
// Central module for Supabase client initialization and server-side session check.

// Import createClient from the main supabase-js library for the BROWSER client instance
import { createClient } from "@supabase/supabase-js";
// Import APIContext type for server-side context
import type { APIContext } from "astro";
// Import Session type
import type { Session } from "@supabase/supabase-js";

// Import the shared SupabaseClient type alias from the server client file
// FIX: Import the SupabaseClient type from the designated file
import type { SupabaseClient } from "./db/supabase.client";

// Import your local Database type (needed if SupabaseClient alias wasn't used)
// import type { Database } from "./db/database.types"; // Adjust path as needed

// --- Supabase Browser Client Instance ---
// This client instance is used in React components that run in the browser.
// It handles client-side session persistence (cookies/localStorage).
// Use your actual Supabase URL and Anon Key from environment variables (PUBLIC prefixed for client access).
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Ensure env vars are checked in development, though Astro handles this somewhat via env.d.ts
if (typeof window !== "undefined" && import.meta.env.DEV && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    "PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY are not set for the browser client. API calls may fail."
  );
}

// Initialize the browser client instance using createClient
// FIX: Use createClient for the browser instance as intended
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // No `browser: true` option in createClient, it's the default for browser environments
  // No custom cookie handling needed for createClient in the browser, SDK handles it.
  global: {
    fetch: fetch.bind(globalThis), // Ensure fetch is bound to globalThis in browser
  },
}) as SupabaseClient; // Assert to the shared type alias

// --- Supabase Server Session Check Helper (Astro SSR) ---
// This function is used in Astro pages/layouts for server-side authentication checks for ROUTE ACCESS.
// It requires the APIContext to access the server-side Supabase client provided by the middleware.

export async function getSession(context: APIContext): Promise<Session | null> {
  // Get the server-side Supabase client instance from context.locals
  // It is already typed as SupabaseClient from src/db/supabase.client in env.d.ts
  const supabaseServer: SupabaseClient = context.locals.supabase;

  if (!supabaseServer) {
    console.error(
      "getSession: Supabase client not found in context.locals. Ensure middleware is running and setting 'context.locals.supabase'."
    );
    // This indicates a critical setup error if middleware didn't run.
    return null;
  }

  // Use the server-side client to get the session from the request cookies
  // This checks if *any* user is authenticated for ROUTE protection.
  const {
    data: { session },
    error: authError,
  } = await supabaseServer.auth.getSession();

  if (authError) {
    console.error("getSession: Error fetching session on server:", authError);
    return null;
  }

  console.log(`getSession: Session found for route protection? ${!!session}`);
  return session;
}
