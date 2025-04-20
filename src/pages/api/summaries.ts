/* eslint-disable no-console */
// src/pages/api/summaries.ts

import type { APIRoute } from "astro";
// Import the Zod library
import { z } from "zod";

// Import your local SupabaseClient type alias AND the default user ID
import { type SupabaseClient, DEFAULT_USER_ID } from "../../db/supabase.client";

// Import Supabase specific types for better error handling and results
import type { PostgrestSingleResponse, PostgrestResponse } from "@supabase/supabase-js";

// Import shared DTOs and DB internal types from central types file
import type {
  MeetingSummaryListEntryDto,
  CreateSummaryResponseDTO,
  MeetingSummaryInsertData, // This now includes 'title' from DB Insert type
  MeetingSummaryFullRow, // This now represents the full row type
  MeetingSummarySelectedColumns, // Explicit type for GET select result
  ListSummariesServiceParams,
} from "../../types"; // Adjust the path if necessary

// --- Zod Schema for List Summaries Query Parameters (dla GET) ---
// Use z.input<ListSummariesCommand> if you want schema input to match the interface
// Or remove annotation and rely on z.infer for output.
// Let's remove the explicit ZodSchema annotation, and use z.infer for the validated output type.
const listSummariesParamsSchema = z.object({
  // sort_by is optional, must be 'created_at' or 'updated_at', defaults to 'created_at'
  // API spec uses 'updated_at', DB uses 'modified_at'. Schema uses API terms.
  sort_by: z.enum(["created_at", "updated_at"]).optional().default("created_at"),
  // sort_order is optional, must be 'asc' or 'desc', defaults to 'desc'
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
  // from_dt is optional, must be a valid ISO 8601 datetime string
  from_dt: z.string().datetime({ message: "Invalid ISO 8601 date format for 'from_dt'." }).optional(),
  // to_dt is optional, must be a valid ISO 8601 datetime string
  to_dt: z.string().datetime({ message: "Invalid ISO 8601 date format for 'to_dt'." }).optional(),
});

// --- Zod Schema for Create Summary Request Body (dla POST) ---
// Remove explicit ZodSchema annotation and use z.infer for the validated output type.
const createSummaryRequestSchema = z.object({
  file_name: z.string().nullable().optional(), // String, null, or undefined input -> string | null output
  transcription: z.string().min(1, { message: "Transcription cannot be empty." }), // Required string input/output
  summary: z
    .string()
    .min(1, { message: "Summary cannot be empty." })
    .max(500, { message: "Summary cannot exceed 500 characters." }), // Required string input/output
  llm_generated: z.boolean({ required_error: "Field 'llm_generated' is required and must be a boolean." }), // Required boolean input/output
  notes: z.string().optional().default(""), // Optional string input -> string output (due to default)
  // 'title' is NOT expected in the request body based on the provided API spec for POST.
});

// --- SummaryService Class (dla GET) ---
// Ta klasa mogłaby być również rozszerzona o metody dla POST, PUT, DELETE
class SummaryService {
  // Use the imported SupabaseClient type alias
  constructor(private supabase: SupabaseClient) {}

  async listUserSummaries(
    // Use the ServiceParams type for clarity
    params: ListSummariesServiceParams
  ): Promise<MeetingSummaryListEntryDto[]> {
    const { userId, dateRange, sortParams } = params;
    try {
      let query = this.supabase
        .from("meeting_summaries")
        // Select fields needed for the list DTO.
        // Explicitly selecting columns and typing the result
        .select("id, title, file_name, created_at, modified_at");

      // Explicitly filter by the provided user ID
      query = query.eq("user_id", userId);

      // Apply date filtering if dates are provided
      if (dateRange.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte("created_at", dateRange.to.toISOString());
      }

      // Apply sorting
      // Service uses DB column names ('modified_at')
      query = query.order(sortParams.by, { ascending: sortParams.order === "asc" });

      // Explicitly type the result of the select query
      // Use the MeetingSummarySelectedColumns type defined in types.ts
      const result: PostgrestResponse<MeetingSummarySelectedColumns> = await query;
      const { data, error } = result;

      if (error) {
        // Log the specific user ID for debugging
        console.error("Database error fetching summaries for user", userId, ":", error);
        // Re-throw a generic error message to avoid exposing DB details
        throw new Error("Failed to fetch summaries from database.");
      }

      // Handle case where data is null (shouldn't happen with select unless there's an issue)
      if (!data) {
        console.warn("GET /api/summaries: Select query returned no data and no error.");
        return []; // Return empty array if no data found
      }

      // Map database rows (MeetingSummarySelectedColumns[]) to DTOs (MeetingSummaryListEntryDto[])
      const summariesDto: MeetingSummaryListEntryDto[] = data.map((row) => ({
        id: row.id,
        title: row.title, // Map the 'title' field
        file_name: row.file_name,
        created_at: row.created_at,
        updated_at: row.modified_at, // Map modified_at to updated_at
      }));

      return summariesDto;
    } catch (error) {
      console.error("Error in SummaryService.listUserSummaries:", error);
      throw error; // Re-throw to be caught by the handler
    }
  }
}

// --- Function Repository (dla POST) ---
// W docelowym projekcie powinna być w oddzielnym pliku (np. src/db/summariesRepository.ts)
// Określamy typ zwracany przez .insert().select().single()
async function insertSummaryIntoDB(
  supabase: SupabaseClient,
  data: MeetingSummaryInsertData // Używamy dedykowanego typu dla danych do insert (pochodzi z types.ts i odzwierciedla DB Insert type)
): Promise<PostgrestSingleResponse<MeetingSummaryFullRow>> {
  // Use Supabase's specific single response type with the full row type
  console.log("Attempting to insert data into DB:", data); // Logowanie danych przed wstawieniem

  // Używamy .insert().select().single() aby pobrać wstawiony rekord
  // select() bez argumentów wybiera wszystkie kolumny (*).
  // Typ MeetingSummaryFullRow powinien odzwierciedlać wszystkie kolumny tabeli dla single().
  const result: PostgrestSingleResponse<MeetingSummaryFullRow> = await supabase
    .from("meeting_summaries")
    .insert([data]) // Insert expects an array of objects
    .select() // Select the inserted data (all columns by default)
    .single(); // Expect only one row back

  if (result.error) {
    console.error("Database insertion failed:", result.error);
  } else {
    console.log("Database insertion successful. New summary ID:", result.data?.id);
  }

  return result;
}

// --- Handler endpoint GET /api/summaries ---
export const GET: APIRoute = async ({ url, locals }) => {
  const supabase = locals.supabase as SupabaseClient;

  if (!supabase) {
    console.error("GET /api/summaries: Supabase client not available in context.locals.");
    return new Response(
      JSON.stringify({
        error: "Internal server error: Database client not available.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // --- Use Static User ID for MVP (GET) ---
  // Authentication check is removed for MVP based on previous plan
  const userId = DEFAULT_USER_ID;

  // --- Use Zod for parameter validation (GET) ---
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const validationResult = listSummariesParamsSchema.safeParse(queryParams);

  // Handle validation errors
  if (!validationResult.success) {
    console.error("GET /api/summaries: Query parameter validation failed:", validationResult.error);
    return new Response(
      JSON.stringify({
        message: "Invalid query parameters",
        errors: validationResult.error.format(), // .format() gives a detailed error structure
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Get the validated parameters with defaults applied
  const validatedParams = validationResult.data; // Type is ListSummariesParsedParams

  // --- Determine Date Range ---
  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  // If neither from_dt nor to_dt were provided, default to last 7 days
  if (validatedParams.from_dt === undefined && validatedParams.to_dt === undefined) {
    const now = new Date();
    // Set time to end of today for 'to' date
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    // Set time to start of the day 7 days ago for 'from' date
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    fromDate = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate(), 0, 0, 0, 0);

    console.log(`DEBUG: Using default 7-day filter: from ${fromDate.toISOString()} to ${toDate.toISOString()}`);
  } else {
    // If provided and valid, convert the strings to Date objects
    if (validatedParams.from_dt !== undefined) {
      fromDate = new Date(validatedParams.from_dt);
    }
    if (validatedParams.to_dt !== undefined) {
      toDate = new Date(validatedParams.to_dt);
    }
    console.log(
      `DEBUG: Using provided date filters: from ${fromDate?.toISOString() || "none"} to ${toDate?.toISOString() || "none"}`
    );
  }

  // Determine the DB column for sorting (modified_at in DB corresponds to updated_at in API)
  // Service expects DB column name
  const dbSortBy: ListSummariesServiceParams["sortParams"]["by"] =
    validatedParams.sort_by === "updated_at" ? "modified_at" : "created_at";
  const sortOrder: ListSummariesServiceParams["sortParams"]["order"] = validatedParams.sort_order;

  // --- Integrate with the SummaryService and return response ---
  try {
    const summaryService = new SummaryService(supabase);

    // Prepare parameters for the service call
    const serviceParams: ListSummariesServiceParams = {
      userId: userId,
      dateRange: { from: fromDate, to: toDate },
      sortParams: { by: dbSortBy, order: sortOrder },
    };

    // Pass the static userId, date range, and sort parameters to the service
    const summariesDto: MeetingSummaryListEntryDto[] = await summaryService.listUserSummaries(serviceParams);

    return new Response(JSON.stringify(summariesDto), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Caught unexpected error in GET /api/summaries handler:", error);
    // Return a generic 500 error response
    return new Response(JSON.stringify({ message: "An internal server error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// --- Handler endpoint POST /api/summaries ---
// Zaimplementowany zgodnie z planem, używając zod i DEFAULT_USER_ID
export const POST: APIRoute = async (context) => {
  // --- Etap 4: Pobranie klienta Supabase z context.locals ---
  const supabase: SupabaseClient = context.locals.supabase;

  if (!supabase) {
    console.error("POST /api/summaries: Supabase client not available in context.locals.");
    return new Response(
      JSON.stringify({
        error: "Internal server error: Database client not available.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  let requestBody: unknown; // Use unknown for initial request body type to satisfy no-explicit-any

  try {
    requestBody = await context.request.json();
  } catch (error) {
    // 400 Obsługa błędu: Nieprawidłowy format JSON
    console.error("POST /api/summaries: Failed to parse request body as JSON:", error);
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

  // --- Walidacja danych wejściowych (zod) ---
  const validationResult = createSummaryRequestSchema.safeParse(requestBody);

  if (!validationResult.success) {
    // 400 Obsługa błędu: Walidacja danych wejściowych nie powiodła się (zod)
    console.error("POST /api/summaries: Input validation failed:", validationResult.error.errors);
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

  const validatedData = validationResult.data; // Type is ValidatedCreateSummaryRequest

  // --- Etap 5: Pobranie DEFAULT_USER_ID ---
  const userIdToAssign = DEFAULT_USER_ID; // Używamy domyślnego ID zgodnie z wytycznymi

  console.log(
    `POST /api/summaries: Validation successful for data assigned to user ID: ${userIdToAssign}. Proceeding to database insertion.`
  );

  // --- Etap 7: Przygotowanie danych do wstawienia i wywołanie funkcji Repository ---
  // Construct the data object for insertion, including the required 'title' field.
  // Generate a default title as it's not in the request body but required by DB.
  // Prioritize file_name if available, otherwise use a generic string.
  // Use MeetingSummaryInsertData (derived from DB Insert type) for type safety.
  const dataToInsert: MeetingSummaryInsertData = {
    user_id: userIdToAssign,
    file_name: validatedData.file_name, // This is string | null from validation
    transcription: validatedData.transcription,
    summary: validatedData.summary,
    llm_generated: validatedData.llm_generated,
    notes: validatedData.notes.length > 0 ? validatedData.notes : null, // DB schema allows NULL notes. Map '' to null.
    title:
      validatedData.file_name && validatedData.file_name.trim().length > 0
        ? validatedData.file_name.trim()
        : `Summary created on ${new Date().toLocaleString()}`, // Assign a default title
    // id, created_at, modified_at are handled by DB defaults/triggers
  };

  const { data: newSummaryRecord, error: dbError } = await insertSummaryIntoDB(supabase, dataToInsert);

  // --- Etap 8: Obsługa odpowiedzi Repository i Błędów DB ---
  if (dbError) {
    // 500 Obsługa błędu: Błąd bazy danych (może być związany z RLS)
    console.error("POST /api/summaries: Error inserting summary into database:", dbError);
    // Return a generic 500 error, avoiding exposing DB details
    return new Response(
      JSON.stringify({
        error: "Internal server error occurred while saving the summary.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check if data is null even if no error (should not happen with single() on INSERT, but good practice)
  // newSummaryRecord is typed as MeetingSummaryFullRow | null from the repository function
  if (!newSummaryRecord) {
    console.error("POST /api/summaries: DB insertion reported no error but returned no data.");
    return new Response(
      JSON.stringify({
        error: "Internal server error: Insertion failed unexpectedly.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Sukces: Rekord został wstawiony. newSummaryRecord jest teraz bezpiecznie używane (non-null).
  console.log("POST /api/summaries: Successfully created new summary record with ID:", newSummaryRecord.id);

  // Mapowanie danych z DB (MeetingSummaryFullRow) na format odpowiedzi API (CreateSummaryResponseDTO)
  const responseData: CreateSummaryResponseDTO = {
    id: newSummaryRecord.id,
    user_id: newSummaryRecord.user_id,
    file_name: newSummaryRecord.file_name,
    created_at: newSummaryRecord.created_at,
    updated_at: newSummaryRecord.modified_at, // Mapowanie modified_at na updated_at
    transcription: newSummaryRecord.transcription, // Zwracamy pełną transkrypcję zgodnie ze specyfikacją POST response
    summary: newSummaryRecord.summary,
    llm_generated: newSummaryRecord.llm_generated,
    notes: newSummaryRecord.notes,
    title: newSummaryRecord.title, // Include title in the response as it's in the DB type now
  };

  // Zwrócenie odpowiedzi sukcesu 201 (Etap 8, część sukcesu)
  return new Response(JSON.stringify(responseData), {
    status: 201,
    headers: {
      "Content-Type": "application/json",
      Location: `/api/summaries/${responseData.id}`, // Dobra praktyka: link do nowo utworzonego zasobu
    },
  });
};

// --- Placeholder Handlers for other methods (PUT, DELETE) ---
// Te metody nie były przedmiotem implementacji w tym zadaniu.

// export const PUT: APIRoute = async ({ params, request, locals }) => { /* ... */ };
// export const DELETE: APIRoute = async ({ params, locals }) => { /* ... */ };
