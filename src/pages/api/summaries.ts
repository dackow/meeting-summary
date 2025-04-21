/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */ // Disabled as per previous discussion
// src/pages/api/summaries.ts -- Handlers for /api/summaries (GET, POST, PUT, DELETE)

import type { APIRoute, APIContext } from "astro";
import { z } from "zod"; // Import the Zod library

// Import your local SupabaseClient type alias AND the default user ID
// IMPORTANT: Using DEFAULT_USER_ID instead of auth.uid() for DB operations in this MVP!
import type { SupabaseClient } from "../../db/supabase.client";
import { DEFAULT_USER_ID } from "../../db/supabase.client"; // Import the default user ID

// Import Supabase specific types for better error handling and results
// FIX: Import PostgrestError for specific error checking
import type { PostgrestSingleResponse, PostgrestResponse, PostgrestError } from "@supabase/supabase-js";

// Import shared DTOs and DB internal types from central types file
import type {
  MeetingSummaryListEntryDto,
  CreateSummaryRequestDTO,
  CreateSummaryResponseDTO,
  UpdateSummaryRequestDTO,
  MeetingSummaryInsertData,
  MeetingSummaryFullRow,
  MeetingSummarySelectedColumns,
  ListSummariesServiceParams,
  MeetingSummaryDetailsDto, // Ensure this is imported if used in service method return types or mapping
} from "../../types"; // Adjust the path if necessary

// Import date-fns parseISO for robust date parsing and date helpers
import { parseISO, startOfDay, endOfDay } from "date-fns";

// FIX: Define a custom error type that includes status
interface ApiErrorWithStatus extends Error {
  status?: number;
}

// --- Zod Schema for List Summaries Query Parameters (for GET /api/summaries) ---
const listSummariesParamsSchema = z.object({
  sort_by: z.enum(["created_at", "updated_at"]).optional().default("created_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
  // Accept date strings (YYYY-MM-DD from input type="date") or full ISO 8601
  from_dt: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(parseISO(val).getTime()), {
      message: "Invalid date format for 'from_dt'.",
    }),
  to_dt: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(parseISO(val).getTime()), {
      message: "Invalid date format for 'to_dt'.",
    }),
});

// --- Zod Schema for Create Summary Request Body (for POST /api/summaries) ---
const createSummaryRequestSchema = z.object({
  file_name: z.string().nullable().optional(), // nullable() allows null, optional() allows undefined
  transcription: z.string().min(1, { message: "Transcription cannot be empty." }),
  summary: z
    .string()
    .min(1, { message: "Summary cannot be empty." })
    .max(500, { message: "Summary cannot exceed 500 characters." }),
  llm_generated: z.boolean({ required_error: "Field 'llm_generated' is required and must be a boolean." }),
  notes: z
    .string()
    .nullable()
    .optional()
    .transform((e) => (e === "" ? null : e)), // Convert empty string to null, allow undefined/null input
});

// --- Zod Schema for Update Summary Request Body (for PUT /api/summaries/{id}) ---
// Allows partial updates
const updateSummaryRequestSchema = z
  .object({
    file_name: z.string().nullable().optional(),
    transcription: z.string().min(1, { message: "Transcription cannot be empty." }).optional(),
    summary: z
      .string()
      .min(1, { message: "Summary cannot be empty." })
      .max(500, { message: "Summary cannot exceed 500 characters." })
      .optional(),
    llm_generated: z.boolean().optional(),
    notes: z
      .string()
      .nullable()
      .optional()
      .transform((e) => (e === "" ? null : e)), // Convert empty string to null, allow undefined/null input
  })
  .partial(); // Make all fields optional at the top level

// --- SummaryService Class (Central logic for DB interaction) ---
// IMPORTANT: In this MVP version, this service uses DEFAULT_USER_ID for DB operations
// instead of relying on auth.uid() via RLS. This is INSECURE and for MVP ONLY.
class SummaryService {
  constructor(private supabase: SupabaseClient) {}

  // Method to list summaries for the DEFAULT_USER_ID
  async listDefaultUserSummaries(params: ListSummariesServiceParams): Promise<MeetingSummaryListEntryDto[]> {
    // userId parameter is included for type compatibility but ignored in this MVP implementation
    // as we are hardcoding DEFAULT_USER_ID.
    const { dateRange, sortParams } = params;
    console.warn(
      `SummaryService: Using hardcoded DEFAULT_USER_ID ${DEFAULT_USER_ID} instead of authenticated user ID (MVP ONLY).`
    );

    try {
      // Select specific columns for the list view
      let query = this.supabase.from("meeting_summaries").select("id, title, file_name, created_at, modified_at");

      // Explicitly filter by DEFAULT_USER_ID, overriding standard RLS based on auth.uid()
      query = query.eq("user_id", DEFAULT_USER_ID);

      if (dateRange.from) {
        // Use >= for 'from' date (start of the day)
        query = query.gte("created_at", startOfDay(dateRange.from).toISOString());
      }
      if (dateRange.to) {
        // Use <= for 'to' date (end of the day)
        query = query.lte("created_at", endOfDay(dateRange.to).toISOString());
      }

      // Map API sort_by terms to DB column names
      // FIX: Remove this redundant and incorrect mapping logic inside the service.
      // const dbSortBy = sortParams.by === "updated_at" ? "modified_at" : "created_at";

      // Apply sorting - Use the mapped DB column name directly from sortParams.by
      // FIX: Changed sortParams.by === "updated_at" ? "modified_at" : "created_at" to just sortParams.by
      query = query.order(sortParams.by, { ascending: sortParams.order === "asc" });

      // Execute the query
      const result: PostgrestResponse<MeetingSummarySelectedColumns> = await query;
      const { data, error } = result;

      if (error) {
        console.error("Database error fetching summaries for DEFAULT user", DEFAULT_USER_ID, ":", error);
        // Even with DEFAULT_USER_ID, RLS might still be active on the table!
        // If RLS is active and configured to check auth.uid(), this query might fail with 42501
        // because auth.uid() will be null or different from DEFAULT_USER_ID.
        // For this MVP phase using DEFAULT_USER_ID, you might need RLS on meeting_summaries
        // temporarily disabled during local testing, or modified to allow SELECT if user_id = DEFAULT_USER_ID
        // or auth.uid() is null/different. This is a conflict in MVP rules.
        // Assuming for this MVP, RLS is permissive enough for DEFAULT_USER_ID queries *or* temporarily disabled.
        // FIX: Use type guard for error code
        if ((error as unknown as PostgrestError).code === "42501") {
          console.error("Potential RLS conflict: Query for DEFAULT_USER_ID failed RLS.");
          // Re-throw as 500, hiding specific RLS error
          throw new Error(
            "Database permission error. Ensure RLS allows access for DEFAULT_USER_ID or is temporarily adjusted."
          );
        }
        throw new Error("Failed to fetch summaries from database.");
      }

      if (!data) {
        console.warn("GET /api/summaries (DEFAULT_USER): Select query returned no data and no error.");
        return []; // Return empty array if no data
      }

      // Map DB rows to frontend DTOs
      const summariesDto: MeetingSummaryListEntryDto[] = data.map((row) => ({
        id: row.id,
        title: row.title,
        file_name: row.file_name,
        created_at: row.created_at,
        updated_at: row.modified_at, // Map DB modified_at to API updated_at
      }));

      return summariesDto;
    } catch (error: unknown) {
      // FIX: Changed type to unknown
      console.error("Error in SummaryService.listDefaultUserSummaries:", error);
      // Pass status code if available, otherwise default to 500
      // FIX: Use type guard for status and message
      const message = error instanceof Error ? error.message : String(error);
      const status =
        error && typeof error === "object" && "status" in error && typeof error.status === "number"
          ? error.status
          : 500;
      const throwError = new Error(message);
      (throwError as ApiErrorWithStatus).status = status;
      throw throwError;
    }
  }

  // Method to get details of a single summary for the DEFAULT_USER_ID
  // FIX: Correct return type to MeetingSummaryFullRow | null as returned by DB query
  async getDefaultUserSummaryDetails(id: string): Promise<MeetingSummaryFullRow | null> {
    console.warn(
      `SummaryService: Using hardcoded DEFAULT_USER_ID ${DEFAULT_USER_ID} instead of authenticated user ID for details (MVP ONLY).`
    );
    try {
      // Select ALL columns (including user_id needed for mapping to FullRow)
      // FIX: select("*") or list all columns for FullRow type
      const query = this.supabase
        .from("meeting_summaries")
        .select("*") // Select all columns to match MeetingSummaryFullRow
        .eq("id", id)
        .eq("user_id", DEFAULT_USER_ID) // Explicitly filter by DEFAULT_USER_ID
        .single(); // Use single() for one expected row

      const { data, error } = await query;

      if (error && error.code === "PGRST116") {
        // Supabase specific error code for "no rows found"
        console.warn(`Summary not found for ID ${id} or not owned by DEFAULT user ${DEFAULT_USER_ID}.`);
        return null; // Return null for 404 case
      } else if (error) {
        console.error(
          `Database error fetching summary details for ID ${id} and DEFAULT user ${DEFAULT_USER_ID}:`,
          error
        );
        // FIX: Use type guard for error code
        if ((error as unknown as PostgrestError).code === "42501") {
          console.error("Potential RLS conflict: Query for DEFAULT_USER_ID failed RLS.");
          throw new Error(
            "Database permission error. Ensure RLS allows access for DEFAULT_USER_ID or is temporarily adjusted."
          );
        }
        throw new Error("Failed to fetch summary details from database.");
      }

      // Data will be of type MeetingSummaryFullRow | null
      return data; // Return the raw data
    } catch (error: unknown) {
      // FIX: Changed type to unknown
      console.error(`Error in SummaryService.getDefaultUserDetails for ID ${id}:`, error);
      // Pass status code if available, otherwise default to 500
      // FIX: Use type guard for status and message
      const message = error instanceof Error ? error.message : String(error);
      const status =
        error && typeof error === "object" && "status" in error && typeof error.status === "number"
          ? error.status
          : 500;
      const throwError = new Error(message);
      (throwError as ApiErrorWithStatus).status = status;
      throw throwError; // Re-throw to be caught by API handler
    }
  }

  // Method to create a new summary for the DEFAULT_USER_ID
  async createDefaultUserSummary(data: CreateSummaryRequestDTO): Promise<MeetingSummaryFullRow> {
    console.warn(`SummaryService: Using hardcoded DEFAULT_USER_ID ${DEFAULT_USER_ID} for creation (MVP ONLY).`);
    // Prepare data for insertion, explicitly setting user_id to DEFAULT_USER_ID
    const dataToInsert: MeetingSummaryInsertData = {
      user_id: DEFAULT_USER_ID, // Assign to DEFAULT user
      file_name: data.file_name,
      transcription: data.transcription,
      summary: data.summary,
      llm_generated: data.llm_generated,
      notes: data.notes, // notes can be string or null from validation
      title:
        data.file_name && data.file_name.trim().length > 0
          ? data.file_name.trim()
          : data.transcription.trim().substring(0, 50) + (data.transcription.trim().length > 50 ? "..." : ""), // Generate title
    };

    console.log("Attempting to insert data into DB for DEFAULT user:", dataToInsert);
    try {
      // Execute the insert query
      // If RLS insert policy checks auth.uid() = user_id, this will fail unless RLS is disabled or adjusted.
      const result: PostgrestSingleResponse<MeetingSummaryFullRow> = await this.supabase
        .from("meeting_summaries")
        .insert([dataToInsert]) // Insert the prepared data
        .select() // Select the inserted row
        .single(); // Expect a single row

      if (result.error) {
        console.error("Database insertion failed for DEFAULT user:", result.error);
        // FIX: Use type guard for error code
        if ((result.error as unknown as PostgrestError).code === "42501") {
          console.error("Potential RLS conflict: Insert for DEFAULT_USER_ID failed RLS.");
          throw new Error(
            "Database permission error. Ensure RLS allows insert for DEFAULT_USER_ID or is temporarily adjusted."
          );
        }
        throw new Error("Failed to save summary to database.");
      }

      if (!result.data) {
        console.error("SummaryService.createDefaultUserSummary: Insert returned no error but no data.");
        throw new Error("Database insertion failed unexpectedly.");
      }

      console.log("Database insertion successful for DEFAULT user. New summary ID:", result.data.id);
      return result.data;
    } catch (error: unknown) {
      // FIX: Changed type to unknown
      console.error("Error in SummaryService.createDefaultUserSummary:", error);
      // Pass status code if available, otherwise default to 500
      // FIX: Use type guard for status and message
      const message = error instanceof Error ? error.message : String(error);
      const status =
        error && typeof error === "object" && "status" in error && typeof error.status === "number"
          ? error.status
          : 500;
      const throwError = new Error(message);
      (throwError as ApiErrorWithStatus).status = status;
      throw throwError;
    }
  }

  // Method to update an existing summary for the DEFAULT_USER_ID
  // FIX: Correct return type to MeetingSummaryFullRow as returned by DB query
  async updateDefaultUserSummary(id: string, data: UpdateSummaryRequestDTO): Promise<MeetingSummaryFullRow | null> {
    console.warn(`SummaryService: Using hardcoded DEFAULT_USER_ID ${DEFAULT_USER_ID} for update (MVP ONLY).`);
    console.log(`Attempting to update summary ${id} for DEFAULT user with data:`, data);
    try {
      // Execute the update query, explicitly filtering by ID and DEFAULT_USER_ID
      // If RLS update policy checks auth.uid() = user_id, this will fail unless RLS is disabled or adjusted.
      const result: PostgrestSingleResponse<MeetingSummaryFullRow> = await this.supabase
        .from("meeting_summaries")
        .update(data) // Update with the provided data
        .eq("id", id) // Target the specific row by ID
        .eq("user_id", DEFAULT_USER_ID) // Explicitly filter by DEFAULT_USER_ID
        .select() // Select the updated row
        .single(); // Expect a single row

      if (result.error && result.error.code === "PGRST116") {
        // Supabase "no rows updated"
        console.warn(`Update attempted on summary ${id} for DEFAULT user but row not found or RLS denied.`);
        // Return null or throw specific error for handler to return 404
        // FIX: Use a proper error type with status
        const notFoundError: ApiErrorWithStatus = new Error(`Summary with ID ${id} not found or access denied.`);
        notFoundError.status = 404; // Tag error for handler
        throw notFoundError; // Throw the error for the handler to catch and return 404
      } else if (result.error) {
        console.error(`Database update failed for ID ${id} and DEFAULT user:`, result.error);
        // FIX: Use type guard for error code
        if ((result.error as unknown as PostgrestError).code === "42501") {
          console.error("Potential RLS conflict: Update for DEFAULT_USER_ID failed RLS.");
          throw new Error(
            "Database permission error. Ensure RLS allows update for DEFAULT_USER_ID or is temporarily adjusted."
          );
        }
        throw new Error("Failed to update summary in database.");
      }

      // Data will be of type MeetingSummaryFullRow | null. If no error, data should exist due to single().
      if (!result.data) {
        console.error(`SummaryService.updateDefaultUserSummary: Update returned no error but no data for ID ${id}.`);
        throw new Error("Database update failed unexpectedly.");
      }

      console.log(`Database update successful for ID ${id} and DEFAULT user.`);
      return result.data; // Return the updated data
    } catch (error: unknown) {
      // FIX: Changed type to unknown
      console.error(`Error in SummaryService.updateDefaultUserSummary for ID ${id}:`, error);
      // Pass status code if available, otherwise default to 500
      // FIX: Use type guard for status and message
      const message = error instanceof Error ? error.message : String(error);
      const status =
        error && typeof error === "object" && "status" in error && typeof error.status === "number"
          ? error.status
          : 500;
      const throwError = new Error(message);
      (throwError as ApiErrorWithStatus).status = status; // Preserve status if available
      throw throwError; // Re-throw to be caught by API handler
    }
  }

  // Method to delete an existing summary for the DEFAULT_USER_ID
  async deleteDefaultUserSummary(id: string): Promise<void> {
    console.warn(`SummaryService: Using hardcoded DEFAULT_USER_ID ${DEFAULT_USER_ID} for delete (MVP ONLY).`);
    console.log(`Attempting to delete summary ${id} for DEFAULT user ${DEFAULT_USER_ID}`);
    try {
      // Execute the delete query, explicitly filtering by ID and DEFAULT_USER_ID
      // If RLS delete policy checks auth.uid() = user_id, this will fail unless RLS is disabled or adjusted.
      const result: PostgrestSingleResponse<null> = await this.supabase
        .from("meeting_summaries")
        .delete() // Perform deletion
        .eq("id", id) // Target the specific row by ID
        .eq("user_id", DEFAULT_USER_ID) // Explicitly filter by DEFAULT_USER_ID
        .single(); // Expect a single row deleted or none (returns null on success)

      if (result.error && result.error.code === "PGRST116") {
        // Supabase "no rows found" for delete
        console.warn(`Delete attempted on summary ${id} for DEFAULT user but row not found or RLS denied.`);
        // FIX: Use a proper error type with status
        const notFoundError: ApiErrorWithStatus = new Error(`Summary with ID ${id} not found or access denied.`);
        notFoundError.status = 404; // Tag error for handler
        throw notFoundError; // Throw the error for the handler to catch and return 404
      } else if (result.error) {
        console.error(`Database delete failed for ID ${id} and DEFAULT user:`, result.error);
        // FIX: Use type guard for error code
        if ((result.error as unknown as PostgrestError).code === "42501") {
          console.error("Potential RLS conflict: Delete for DEFAULT_USER_ID failed RLS.");
          throw new Error(
            "Database permission error. Ensure RLS allows delete for DEFAULT_USER_ID or is temporarily adjusted."
          );
        }
        throw new Error("Failed to delete summary from database.");
      }

      // Success! result.data will be null for delete single().
      console.log(`Database delete successful for ID ${id} and DEFAULT user.`);
      return; // Return void on success
    } catch (error: unknown) {
      // FIX: Changed type to unknown
      console.error(`Error in SummaryService.deleteDefaultUserSummary for ID ${id}:`, error);
      // Pass status code if available, otherwise default to 500
      // FIX: Use type guard for status and message
      const message = error instanceof Error ? error.message : String(error);
      const status =
        error && typeof error === "object" && "status" in error && typeof error.status === "number"
          ? error.status
          : 500;
      const throwError = new Error(message);
      (throwError as ApiErrorWithStatus).status = status; // Preserve status if available
      throw throwError; // Re-throw to be caught by API handler
    }
  }
}

// --- Handler endpoint GET /api/summaries ---
// Implements the List Summaries endpoint.
// Authentication check is SKIPPED. Data filtered by DEFAULT_USER_ID.
export const GET: APIRoute = async ({ url, locals }) => {
  const supabase = locals.supabase as SupabaseClient;

  // --- Get Supabase client from context.locals ---
  if (!supabase) {
    console.error("GET /api/summaries: Supabase client not available in context.locals.");
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
  console.log(
    "GET /api/summaries: Authentication check SKIPPED as per specific MVP rule. Data filtered by DEFAULT_USER_ID."
  );
  // const { data: { user }, error: authError } = await supabase.auth.getUser(); // Not used

  // --- Use Zod for parameter validation (GET) ---
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const validationResult = listSummariesParamsSchema.safeParse(queryParams);

  if (!validationResult.success) {
    console.error("GET /api/summaries: Query parameter validation failed:", validationResult.error);
    return new Response(
      JSON.stringify({
        message: "Invalid query parameters",
        errors: validationResult.error.format(),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const validatedParams = validationResult.data;

  // --- Determine Date Range ---
  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  if (validatedParams.from_dt === undefined && validatedParams.to_dt === undefined) {
    // Default to last 7 days
    const now = new Date();
    toDate = endOfDay(now); // End of today
    fromDate = startOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)); // Start of 7 days ago
    console.log(`DEBUG: Using default 7-day filter: from ${fromDate.toISOString()} to ${toDate.toISOString()}`);
  } else {
    if (validatedParams.from_dt !== undefined) {
      // Parse the date string provided
      fromDate = parseISO(validatedParams.from_dt);
      if (isNaN(fromDate.getTime())) fromDate = undefined; // Handle potential parse failure after refine
    }
    if (validatedParams.to_dt !== undefined) {
      // Parse the date string provided
      toDate = parseISO(validatedParams.to_dt);
      if (isNaN(toDate.getTime())) toDate = undefined; // Handle potential parse failure after refine
    }
    console.log(
      `DEBUG: Using provided date filters: from ${fromDate?.toISOString() || "none"} to ${toDate?.toISOString() || "none"}`
    );
  }

  // Map API sort_by terms to DB column names for the Service layer
  const dbSortBy: ListSummariesServiceParams["sortParams"]["by"] =
    validatedParams.sort_by === "updated_at" ? "modified_at" : "created_at";
  const sortOrder: ListSummariesServiceParams["sortParams"]["order"] = validatedParams.sort_order;

  try {
    const summaryService = new SummaryService(supabase);

    const serviceParams: ListSummariesServiceParams = {
      userId: DEFAULT_USER_ID, // Pass DEFAULT user ID to service
      dateRange: { from: fromDate, to: toDate },
      sortParams: { by: dbSortBy, order: sortOrder },
    };

    // Use the specific service method for the default user
    const summariesDto: MeetingSummaryListEntryDto[] = await summaryService.listDefaultUserSummaries(serviceParams);

    return new Response(JSON.stringify(summariesDto), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    // FIX: Changed type to unknown
    // FIX: Use type guards for status and message
    const message = error instanceof Error ? error.message : String(error);
    const status =
      error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 500;

    console.error("Caught error in GET /api/summaries handler (DEFAULT_USER):", error);

    if (status === 404 || status === 403) {
      return new Response(JSON.stringify({ message: message || "Access Denied/Not Found" }), {
        status: status, // Preserve status if service tagged it
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ message: "An internal server error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// --- Handler endpoint POST /api/summaries ---
// Implements the Create New Summary endpoint.
// Authentication check is SKIPPED. Data assigned to DEFAULT_USER_ID.
export const POST: APIRoute = async ({ request, locals }) => {
  // --- Get Supabase client from context.locals ---
  const supabase: SupabaseClient = locals.supabase;

  if (!supabase) {
    console.error("POST /api/summaries: Supabase client not available in context.locals.");
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
  console.log(
    "POST /api/summaries: Authentication check SKIPPED as per specific MVP rule. Data assigned to DEFAULT_USER_ID."
  );
  // const { data: { user }, error: authError } = await supabase.auth.getUser(); // Not used
  // const userId = user.id; // Not used

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch (error) {
    console.error("POST /api/summaries: Failed to parse request body as JSON:", error);
    return new Response(
      JSON.stringify({
        error: "Invalid JSON body",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const validationResult = createSummaryRequestSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.error("POST /api/summaries: Input validation failed:", validationResult.error.errors);
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validationResult.error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validatedData = validationResult.data;

    // --- Call Service to insert data for DEFAULT_USER_ID ---
    const summaryService = new SummaryService(supabase);
    // Pass validated data to service. Service will use DEFAULT_USER_ID internally.
    const newSummaryRecord: MeetingSummaryFullRow = await summaryService.createDefaultUserSummary(validatedData);

    console.log(
      "POST /api/summaries: Successfully created new summary record with ID:",
      newSummaryRecord.id,
      "for DEFAULT user."
    );

    // Map DB row to frontend DTO
    const responseData: CreateSummaryResponseDTO = {
      id: newSummaryRecord.id,
      user_id: newSummaryRecord.user_id,
      file_name: newSummaryRecord.file_name,
      created_at: newSummaryRecord.created_at,
      updated_at: newSummaryRecord.modified_at, // Map DB modified_at to API updated_at
      transcription: newSummaryRecord.transcription,
      summary: newSummaryRecord.summary,
      llm_generated: newSummaryRecord.llm_generated,
      notes: newSummaryRecord.notes,
      title: newSummaryRecord.title,
    };

    return new Response(JSON.stringify(responseData), {
      status: 201, // 201 Created
      headers: {
        "Content-Type": "application/json",
        Location: `/api/summaries/${responseData.id}`, // HATEOAS principle
      },
    });
  } catch (error: unknown) {
    // FIX: Changed type to unknown
    // FIX: Use type guards for status and message
    const message = error instanceof Error ? error.message : String(error);
    const status =
      error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 500;

    console.error("Caught error in POST /api/summaries handler (DEFAULT_USER):", error);

    if (status === 404 || status === 403) {
      return new Response(JSON.stringify({ message: message || "Access Denied/Not Found" }), {
        status: status, // Preserve status if service tagged it
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "An internal server error occurred while saving the summary." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// --- Handler endpoint PUT /api/summaries/{id} ---
// Implements the Update Existing Summary endpoint.
// Authentication check is SKIPPED. Updates summary for DEFAULT_USER_ID.
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const summaryId = params.id; // Get ID from URL parameters

  if (!summaryId) {
    console.warn("PUT /api/summaries: Missing summary ID in URL.");
    return new Response(JSON.stringify({ error: "Summary ID is required in the URL." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Get Supabase client from context.locals ---
  const supabase: SupabaseClient = locals.supabase;

  if (!supabase) {
    console.error("PUT /api/summaries: Supabase client not available in context.locals.");
    return new Response(JSON.stringify({ error: "Internal server error: Database client not available." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Authentication Check (SKIPPED per MVP rule) ---
  console.log(
    `PUT /api/summaries/${summaryId}: Authentication check SKIPPED as per specific MVP rule. Updates summary for DEFAULT_USER_ID.`
  );
  // const { data: { user }, error: authError } = await supabase.auth.getUser(); // Not used
  // const userId = user.id; // Not used

  let requestBody: unknown;
  try {
    // --- Parse Request Body ---
    requestBody = await request.json();
  } catch (error) {
    console.error(`PUT /api/summaries/${summaryId}: Failed to parse request body as JSON:`, error);
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // --- Input Validation (zod) ---
    const validationResult = updateSummaryRequestSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.error(`PUT /api/summaries/${summaryId}: Input validation failed:`, validationResult.error.errors);
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validationResult.error.errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validatedData: UpdateSummaryRequestDTO = validationResult.data;

    // Ensure there's at least one field being updated
    if (Object.keys(validatedData).length === 0) {
      console.warn(`PUT /api/summaries/${summaryId}: Request body is empty, no fields to update.`);
      return new Response(JSON.stringify({ error: "Request body must contain fields to update." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // --- Call Service to update data for DEFAULT_USER_ID ---
    const summaryService = new SummaryService(supabase);
    // Pass updated data and summaryId to service. Service will use DEFAULT_USER_ID internally.
    // FIX: Expect MeetingSummaryFullRow or null return type from service
    const updatedSummaryRecord: MeetingSummaryFullRow | null = await summaryService.updateDefaultUserSummary(
      summaryId,
      validatedData
    );

    // FIX: Handle null return (404 Not Found)
    if (!updatedSummaryRecord) {
      console.warn(`PUT /api/summaries/${summaryId}: Service returned null, likely 404 Not Found.`);
      return new Response(JSON.stringify({ message: `Summary with ID ${summaryId} not found or access denied.` }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`PUT /api/summaries/${summaryId}: Successfully updated summary record for DEFAULT user.`);

    // Map DB row to frontend DTO (MeetingSummaryDetailsDto for consistency with GET details)
    const responseData: MeetingSummaryDetailsDto = {
      id: updatedSummaryRecord.id,
      title: updatedSummaryRecord.title, // Include title as it's in the DB row
      file_name: updatedSummaryRecord.file_name,
      created_at: updatedSummaryRecord.created_at,
      updated_at: updatedSummaryRecord.modified_at, // Map DB modified_at to API updated_at
      transcription: updatedSummaryRecord.transcription,
      summary: updatedSummaryRecord.summary,
      llm_generated: updatedSummaryRecord.llm_generated,
      notes: updatedSummaryRecord.notes,
      // user_id is omitted from this DTO
    };

    return new Response(JSON.stringify(responseData), {
      status: 200, // 200 OK
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    // FIX: Changed type to unknown
    // FIX: Use type guards for status and message
    const message = error instanceof Error ? error.message : String(error);
    const status =
      error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 500;

    console.error(`PUT /api/summaries/${summaryId}: Caught error after validation (DEFAULT_USER):`, error);
    // Check if it's a known error type from service
    if (status === 404) {
      // Service indicates Not Found/Not Owned - redundant if null check above works
      return new Response(
        JSON.stringify({
          message: message || `Summary with ID ${summaryId} not found or access denied.`,
        }),
        {
          status: 404, // Return 404 Not Found
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    // FIX: Use type guard for error code
    if (
      (error &&
        typeof error === "object" &&
        "code" in error &&
        typeof error.code === "string" &&
        error.code === "42501") ||
      status === 403
    ) {
      // Service indicates Permission Denied
      return new Response(
        JSON.stringify({
          message:
            message || `Permission denied for summary ID ${summaryId}. Ensure RLS allows access for DEFAULT_USER_ID.`,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return new Response(
      JSON.stringify({ error: `An internal server error occurred while updating summary ID ${summaryId}.` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// --- Handler endpoint DELETE /api/summaries/{id} ---
// Implements the Delete Summary endpoint.
// Authentication check is SKIPPED. Deletes summary for DEFAULT_USER_ID.
export const DELETE: APIRoute = async ({ params, locals }) => {
  const summaryId = params.id; // Get ID from URL parameters

  if (!summaryId) {
    console.warn("DELETE /api/summaries: Missing summary ID in URL.");
    return new Response(JSON.stringify({ error: "Summary ID is required in the URL." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Get Supabase client from context.locals ---
  const supabase: SupabaseClient = locals.supabase;

  if (!supabase) {
    console.error("DELETE /api/summaries: Supabase client not available in context.locals.");
    return new Response(JSON.stringify({ error: "Internal server error: Database client not available." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Authentication Check (SKIPPED per MVP rule) ---
  console.log(
    `DELETE /api/summaries/${summaryId}: Authentication check SKIPPED as per specific MVP rule. Deletes summary for DEFAULT_USER_ID.`
  );
  // const { data: { user }, error: authError } = await supabase.auth.getUser(); // Not used
  // const userId = user.id; // Not used

  try {
    // --- Call Service to delete data for DEFAULT_USER_ID ---
    const summaryService = new SummaryService(supabase);
    // Pass summaryId to service. Service will use DEFAULT_USER_ID internally.
    await summaryService.deleteDefaultUserSummary(summaryId);

    console.log(`DELETE /api/summaries/${summaryId}: Successfully deleted summary record for DEFAULT user.`);

    return new Response(null, {
      // 204 No Content
      status: 204,
      // No body for 204 response
    });
  } catch (error: unknown) {
    // FIX: Changed type to unknown
    // FIX: Use type guards for status and message
    const message = error instanceof Error ? error.message : String(error);
    const status =
      error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 500;

    console.error(`DELETE /api/summaries/${summaryId}: Caught error (DEFAULT_USER):`, error);

    if (status === 404) {
      return new Response(
        JSON.stringify({
          message: message || `Summary with ID ${summaryId} not found or access denied.`,
        }),
        {
          status: 404, // Return 404 Not Found
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    // FIX: Use type guard for error code
    if (
      (error &&
        typeof error === "object" &&
        "code" in error &&
        typeof error.code === "string" &&
        error.code === "42501") ||
      status === 403
    ) {
      // This might happen if RLS is still partially active
      return new Response(
        JSON.stringify({
          message:
            message || `Permission denied for summary ID ${summaryId}. Ensure RLS allows delete for DEFAULT_USER_ID.`,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return new Response(
      JSON.stringify({ error: `An internal server error occurred while deleting summary ID ${summaryId}.` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const prerender = false; // Needed for server routes
