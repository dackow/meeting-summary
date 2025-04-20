/* eslint-disable no-console */
// src/pages/api/generate-summary.ts -- Handler for /api/generate-summary (POST)

import type { APIRoute } from "astro";
// Import the Zod library
import { z } from "zod";

// Import types for request and response DTOs
import type { GenerateSummaryCommand, GenerateSummaryResponseDto } from "../../types"; // Adjust the path if necessary

// Import SupabaseClient type (not used for authentication check in this endpoint as per instruction)
import type { SupabaseClient } from "../../db/supabase.client"; // Adjust the path if necessary

// --- Zod Schema for Generate Summary Request Body ---
const generateSummaryRequestSchema: z.ZodSchema<GenerateSummaryCommand> = z.object({
  transcription: z.string().min(1, { message: "Transcription cannot be empty." }), // Required non-empty string
});

// Define the inferred type from the schema for validated data
type ValidatedGenerateSummaryRequest = z.infer<typeof generateSummaryRequestSchema>;

// --- Mock LLM Logic ---
// This function simulates calling an LLM API for summary generation
// In a real application, this would interact with an external LLM provider API
async function generateSummaryMock(transcription: string): Promise<string> {
  console.log("Calling mock LLM with transcription (first 100 chars):", transcription.substring(0, 100) + "...");

  try {
    // Simulate some async work (like calling an external API)
    await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate network latency

    // --- Mock Logic: Extract the first line as the summary ---
    const firstLine = transcription.split("\n")[0] || ""; // Handle empty transcription gracefully

    // Ensure summary is max 500 characters, truncate if necessary
    const maxSummaryLength = 500;
    const mockSummary = firstLine.substring(0, maxSummaryLength);

    console.log("Mock LLM returning summary:", mockSummary.substring(0, 100) + "...");

    // Simulate occasional errors for testing the 500 case (Optional, remove for stable mock)
    // if (Math.random() < 0.1) { // 10% chance of failure
    //     throw new Error("Simulated LLM failure.");
    // }

    return mockSummary;
  } catch (error) {
    // Log the error internally if mock logic fails unexpectedly
    console.error("Error in mock LLM function:", error);
    // Re-throw a generic error to be caught by the handler's try...catch
    throw new Error("Mock LLM generation failed.");
  }
}

// --- Handler endpoint POST /api/generate-summary ---
// Implements the Generate Summary endpoint.
// Authentication check is skipped as per current instruction.
export const POST: APIRoute = async (context) => {
  // Although not used for authentication check here, Supabase client might be needed for
  // other reasons in a real scenario, so checking its availability is reasonable.
  const supabase: SupabaseClient = context.locals.supabase;

  if (!supabase) {
    console.error("POST /api/generate-summary: Supabase client not available in context.locals.");
    // Return 500 as this indicates a server-side configuration issue
    return new Response(
      JSON.stringify({
        error: "Internal server error: Database client configuration issue.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // --- Authentication Check (Skipped as per current instruction) ---
  // const { data: { user }, error: authError } = await supabase.auth.getUser();
  // if (authError || !user) { ... return 401 ... }
  console.log("POST /api/generate-summary: Authentication check skipped as per instruction.");
  // No user ID is needed for this endpoint as it doesn't interact with DB data.

  let requestBody: unknown; // Use unknown for initial request body type

  try {
    // --- Odczyt ciała żądania JSON ---
    requestBody = await context.request.json();
  } catch (error) {
    // 400 Obsługa błędu: Nieprawidłowy format JSON
    console.error("POST /api/generate-summary: Failed to parse request body as JSON:", error);
    return new Response(
      JSON.stringify({
        error: "Invalid JSON body",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Use a try...catch for errors *after* JSON parsing
  try {
    // --- Walidacja danych wejściowych (zod) ---
    const validationResult = generateSummaryRequestSchema.safeParse(requestBody);

    if (!validationResult.success) {
      // 400 Obsługa błędu: Walidacja danych wejściowych nie powiodła się (zod)
      console.error("POST /api/generate-summary: Input validation failed:", validationResult.error.errors);
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validationResult.error.errors, // Zod errors array
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const validatedData: ValidatedGenerateSummaryRequest = validationResult.data;
    console.log("POST /api/generate-summary: Validation successful.");

    // --- Wywołanie metody serwisowej (mocka LLM) ---
    const generatedSummary = await generateSummaryMock(validatedData.transcription);

    // --- Obsługa odpowiedzi z serwisu i zwrócenie 200 OK ---
    const responseData: GenerateSummaryResponseDto = {
      summary: generatedSummary,
    };

    return new Response(JSON.stringify(responseData), {
      status: 200, // 200 OK for successful generation
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // --- Implementacja obsługi błędów serwera / LLM (500) ---
    // This catches errors from validation subsequent logic (like the mock call)
    console.error("POST /api/generate-summary: Caught unexpected error after validation:", error);
    // Return a generic 500 error response
    return new Response(
      JSON.stringify({
        error: "An internal server error occurred during summary generation.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
