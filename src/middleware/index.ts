// src/middleware/index.ts
import { defineMiddleware } from "astro:middleware";
import type { APIContext } from "astro"; // Import APIContext type
// FIX: Remove import of AstroCookieSetOptions and AstroCookieDeleteOptions as they are not exported from "astro"
// import type { AstroCookieSetOptions, AstroCookieDeleteOptions } from "astro"; // Import Astro cookie option types

// Import the createServerClient function and Database type from your local files
import { createServerClient } from "../db/supabase.client.ts"; // Use your local imports
import type { Database } from "../db/database.types.ts"; // Adjust path if necessary
import type { CookieOptions } from "@supabase/ssr"; // Import Supabase CookieOptions type

export const onRequest = defineMiddleware(async (context: APIContext, next) => {
  // Ensure environment variables are available server-side
  // FIX: Access server-side environment variables directly via import.meta.env in middleware
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("SUPABASE_URL or SUPABASE_KEY not found in server environment variables.");
    // In production, you might want to halt or return a specific error page.
    // For development, let's just log and proceed, although Supabase calls will likely fail.
    // return new Response("Internal Server Error: Supabase environment variables not set.", { status: 500 });
  }

  // Create a Supabase client instance specifically for this server-side request
  // This client will automatically read/write cookies based on the request/response
  // and is essential for server-side authentication checks and RLS to work correctly with auth.uid().
  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      // FIX: Implement get to match Supabase's expected async signature and return type
      get: async (name: string): Promise<string | undefined> => {
        // Astro's context.cookies.get is synchronous in this context, but Supabase expects async.
        // Return Promise.resolve to match the expected interface type requirement.
        const cookie = context.cookies.get(name);
        // AstroCookie.value is string | undefined. Return string | undefined to match Supabase's GetCookie return.
        // Supabase's GetCookie type allows string | null | undefined | Promise<...>.
        return cookie?.value; // Returns string | undefined (which is compatible)
      },
      // FIX: Implement set to match Supabase's expected signature and use inferred Astro options type
      set: (name: string, value: string, options: CookieOptions): void => {
        // Convert Supabase options to Astro options
        // Astro's set options are compatible with Supabase's, check types for minor differences.
        // Ensure `expires` is handled correctly if it's a Date object from Supabase.
        // FIX: Remove explicit type annotation for astroOptions and let TypeScript infer
        const astroOptions = {
          ...options, // Includes domain, path, secure, httpOnly, sameSite
          expires: options.expires instanceof Date ? options.expires : undefined, // Ensure expires is a Date object or undefined
          maxAge: options.maxAge, // maxAge is a number or undefined
          // Supabase's options object matches Astro's structure well.
        };
        // Astro's context.cookies.set is synchronous
        context.cookies.set(name, value, astroOptions);
      },
      // FIX: Implement remove to match Supabase's expected signature and use inferred Astro options type
      remove: (name: string, options: CookieOptions): void => {
        // Convert Supabase options to Astro options
        // FIX: Remove explicit type annotation for astroOptions and let TypeScript infer
        const astroOptions = {
          ...options, // Includes domain, path, secure, httpOnly, sameSite
          expires: options.expires instanceof Date ? options.expires : undefined, // Ensure expires is a Date object or undefined
          maxAge: options.maxAge, // maxAge is a number or undefined
          // Supabase's options object matches Astro's structure well.
        };
        // Astro's context.cookies.delete is synchronous
        context.cookies.delete(name, astroOptions);
      },
    },
  });

  // Attach the server-side Supabase client to context.locals
  context.locals.supabase = supabase; // Keep using the local alias type

  // Call the next middleware or the page/API handler
  return next();
});
