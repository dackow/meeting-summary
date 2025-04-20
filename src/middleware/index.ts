// src/middeware/index.ts
import { defineMiddleware } from "astro:middleware";

// To importuje INSTANCJĘ klienta Supabase (const supabaseClient) z PLIKU, KTÓRY JĄ TWORZY
import { supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware((context, next) => {
  console.error("DEBUG MIDDLEWARE: supabaseClient imported:", typeof supabaseClient, supabaseClient !== undefined); // Tymczasowe logowanie

  context.locals.supabase = supabaseClient;

  console.error(
    "DEBUG MIDDLEWARE: context.locals.supabase after assignment:",
    typeof context.locals.supabase,
    context.locals.supabase !== undefined
  ); // Tymczasowe logowanie

  return next();
});
