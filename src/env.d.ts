/// <reference types="astro/client" />

// Import the SupabaseClient type alias from your local client file
import { type SupabaseClient } from "../../db/supabase.client";

declare global {
  namespace App {
    interface Locals {
      // Use the imported SupabaseClient type alias, which is SupabaseClientBase<Database>
      // The Database type is brought in by the alias itself, no need to parameterize here
      supabase: SupabaseClient; // <--- Use the alias type directly
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string; // Ensure this matches your .env file
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
