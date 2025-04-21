/// <reference types="astro/client" />

// Import the SupabaseClient type alias from your local client file
import { type SupabaseClient } from "./db/supabase.client";

declare global {
  namespace App {
    interface Locals {
      // Use the imported SupabaseClient type alias, which is SupabaseClientBase<Database>
      // The Database type is brought in by the alias itself, no need to parameterize here
      supabase: SupabaseClient; // <--- Use the alias type directly for the server client instance
      // Add other server-side locals here if needed
      runtime: {
        env: ImportMetaEnv; // Make server-side env vars available in locals.runtime.env
      };
    }
  }
}

interface ImportMetaEnv {
  // Public variables (available client-side via import.meta.env.PUBLIC_...)
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;

  // Server-side variables (available only on the server via import.meta.env or locals.runtime.env)
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string; // Ensure this matches your .env file

  // Add any other server-side environment variables here
  // readonly SUPABASE_SERVICE_ROLE_KEY: string; // Example server-side key
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
