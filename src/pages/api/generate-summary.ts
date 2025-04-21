/* eslint-disable no-console */
// src/pages/api/generate-summary.ts -- Handler for /api/generate-summary (POST)

import type { APIRoute } from "astro";
import { z } from "zod"; // Import the Zod library

// Import types for request and response DTOs
import type { GenerateSummaryCommand, GenerateSummaryResponseDto } from "../../types"; // Adjust the path if necessary

// Import SupabaseClient type (client is available in context.locals but auth check is skipped per MVP rule)
import type { SupabaseClient } from "../../db/supabase.client"; // Adjust the path if necessary

// --- Zod Schema for Generate Summary Request Body ---
const generateSummaryRequestSchema: z.ZodSchema<GenerateSummaryCommand> = z.object({
  transcription: z.string().min(1, { message: "Transcription cannot be empty." }), // Required non-empty string
});

// Define the inferred type from the schema for validated data
type ValidatedGenerateSummaryRequest = z.infer<typeof generateSummaryRequestSchema>;

// --- LLM Service Placeholder ---
// This function is a placeholder for calling a real LLM API
// Replace this mock logic with actual API call implementation
async function callLLMService(transcription: string): Promise<string> {
  console.log(
    "Calling placeholder LLM service with transcription (first 100 chars):",
    transcription.substring(0, 100) + "..."
  );

  // --- Replace with actual LLM API call (e.g., fetch to OpenAI, OpenRouter, Ollama) ---
  // Example using fetch (replace with your actual LLM provider details and API key)
  /*
  // Note: OPENROUTER_API_KEY is server-side only, accessed via import.meta.env in Astro API routes
  const apiKey = import.meta.env.OPENROUTER_API_KEY;

  try {
    const response = await fetch("https://api.openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Recommended headers for OpenRouter to identify your app
        "HTTP-Referer": 'YOUR_APP_URL_OR_IDENTIFIER', // Replace with your app's URL or a unique identifier
        "X-Title": "Meeting Summarizer MVP",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo", // Or another suitable model
        messages: [
          { role: "system", content: "Jesteś pomocnym asystentem podsumowującym spotkania. Stwórz zwięzłe podsumowanie (do 500 znaków) na podstawie transkrypcji w języku polskim." },
          { role: "user", content: transcription },
        ],
        max_tokens: 200, // Adjust token limit as needed to stay within 500 chars
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("LLM API Error:", response.status, errorBody);
      throw new Error(`LLM API returned status ${response.status}: ${errorBody.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0]?.message?.content || "";

    // Simple truncation just in case LLM exceeds expected length
    const maxSummaryLength = 500;
    const finalSummary = generatedText.substring(0, maxSummaryLength);

    console.log("LLM service returned summary:", finalSummary.substring(0, 100) + "...");
    return finalSummary;

  } catch (error) {
    console.error("Error communicating with LLM API:", error);
    // Log the full error details on the server
    throw new Error("Failed to communicate with summary generation service.");
  }
  */

  // --- Current Mock Logic (Remove for production) ---
  await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate delay
  if (Math.random() < 0.15) {
    // Simulate occasional error (15% chance)
    console.error("Simulating LLM error");
    throw new Error("Simulated LLM failure.");
  }
  const mockSummary = transcription.split("\n")[0]?.substring(0, 500) || "Mock summary.";
  console.log("Mock LLM returning summary:", mockSummary.substring(0, 100) + "...");
  return mockSummary;
  // --- End Mock Logic ---
}

// --- Handler endpoint POST /api/generate-summary ---
// Implements the Generate Summary endpoint.
// Authentication check is SKIPPED as per specific MVP rule.
export const POST: APIRoute = async (context) => {
  // Supabase client is available, but auth check is skipped per specific MVP rule.
  const supabase: SupabaseClient = context.locals.supabase;

  if (!supabase) {
    console.error("POST /api/generate-summary: Supabase client not available in context.locals.");
    return new Response(
      JSON.stringify({
        error: "Internal server error: Database client not available.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // --- Authentication Check (SKIPPED per MVP rule) ---
  // const { data: { user }, error: authError } = await supabase.auth.getUser();
  // if (authError || !user) { ... return 401 ... }
  console.log("POST /api/generate-summary: Authentication check SKIPPED as per specific MVP rule.");
  // No user ID is needed for the LLM call itself.

  let requestBody: unknown; // Use unknown for initial request body type

  try {
    // --- Parse Request Body ---
    requestBody = await context.request.json();
  } catch (error) {
    // 400 Error Handling: Invalid JSON format
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
    // --- Input Validation (zod) ---
    const validationResult = generateSummaryRequestSchema.safeParse(requestBody);

    if (!validationResult.success) {
      // 400 Error Handling: Input validation failed (zod)
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

    // --- Call LLM Service (or mock) ---
    // Authentication token is NOT passed to the LLM service call as per specific MVP rule.
    const generatedSummary = await callLLMService(validatedData.transcription);

    // --- Handle Service Response and Return 200 OK ---
    const responseData: GenerateSummaryResponseDto = {
      summary: generatedSummary,
    };

    return new Response(JSON.stringify(responseData), {
      status: 200, // 200 OK for successful generation
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // --- Server Error Handling (500) ---
    // This catches errors from validation subsequent logic (like the LLM call)
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

// Note: Only POST is implemented for this endpoint as per plan.
export const prerender = false; // Needed for server routes
