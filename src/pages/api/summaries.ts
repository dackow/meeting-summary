/* eslint-disable no-console */
// src/pages/api/summaries.ts -- Handlers for /api/summaries (GET and POST)

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
  MeetingSummaryInsertData,
  MeetingSummaryFullRow,
  MeetingSummarySelectedColumns,
  ListSummariesServiceParams,
} from "../../types"; // Adjust the path if necessary

// --- Zod Schema for List Summaries Query Parameters (dla GET) ---
const listSummariesParamsSchema = z.object({
  sort_by: z.enum(["created_at", "updated_at"]).optional().default("created_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
  from_dt: z.string().datetime({ message: "Invalid ISO 8601 date format for 'from_dt'." }).optional(),
  to_dt: z.string().datetime({ message: "Invalid ISO 8601 date format for 'to_dt'." }).optional(),
});

// --- Zod Schema for Create Summary Request Body (dla POST) ---
const createSummaryRequestSchema = z.object({
  file_name: z.string().nullable().optional(),
  transcription: z.string().min(1, { message: "Transcription cannot be empty." }),
  summary: z
    .string()
    .min(1, { message: "Summary cannot be empty." })
    .max(500, { message: "Summary cannot exceed 500 characters." }),
  llm_generated: z.boolean({ required_error: "Field 'llm_generated' is required and must be a boolean." }),
  notes: z.string().optional().default(""),
});

// --- SummaryService Class (dla GET) ---
class SummaryService {
  constructor(private supabase: SupabaseClient) {}

  async listUserSummaries(params: ListSummariesServiceParams): Promise<MeetingSummaryListEntryDto[]> {
    const { userId, dateRange, sortParams } = params;
    try {
      let query = this.supabase.from("meeting_summaries").select("id, title, file_name, created_at, modified_at");

      query = query.eq("user_id", userId);

      if (dateRange.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte("created_at", dateRange.to.toISOString());
      }

      const result: PostgrestResponse<MeetingSummarySelectedColumns> = await query.order(sortParams.by, {
        ascending: sortParams.order === "asc",
      });
      const { data, error } = result;

      if (error) {
        console.error("Database error fetching summaries for user", userId, ":", error);
        throw new Error("Failed to fetch summaries from database.");
      }

      if (!data) {
        console.warn("GET /api/summaries: Select query returned no data and no error.");
        return [];
      }

      const summariesDto: MeetingSummaryListEntryDto[] = data.map((row) => ({
        id: row.id,
        title: row.title,
        file_name: row.file_name,
        created_at: row.created_at,
        updated_at: row.modified_at,
      }));

      return summariesDto;
    } catch (error) {
      console.error("Error in SummaryService.listUserSummaries:", error);
      throw error;
    }
  }
}

// --- Function Repository (dla POST) ---
async function insertSummaryIntoDB(
  supabase: SupabaseClient,
  data: MeetingSummaryInsertData
): Promise<PostgrestSingleResponse<MeetingSummaryFullRow>> {
  console.log("Attempting to insert data into DB:", data);

  const result: PostgrestSingleResponse<MeetingSummaryFullRow> = await supabase
    .from("meeting_summaries")
    .insert([data])
    .select()
    .single();

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
  // Authentication check is removed for MVP based on instruction.
  // Uses DEFAULT_USER_ID instead of authenticated user ID.
  const userId = DEFAULT_USER_ID;

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
    const now = new Date();
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    fromDate = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate(), 0, 0, 0, 0);
    console.log(`DEBUG: Using default 7-day filter: from ${fromDate.toISOString()} to ${toDate.toISOString()}`);
  } else {
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

  const dbSortBy: ListSummariesServiceParams["sortParams"]["by"] =
    validatedParams.sort_by === "updated_at" ? "modified_at" : "created_at";
  const sortOrder: ListSummariesServiceParams["sortParams"]["order"] = validatedParams.sort_order;

  try {
    const summaryService = new SummaryService(supabase);

    const serviceParams: ListSummariesServiceParams = {
      userId: userId,
      dateRange: { from: fromDate, to: toDate },
      sortParams: { by: dbSortBy, order: sortOrder },
    };

    const summariesDto: MeetingSummaryListEntryDto[] = await summaryService.listUserSummaries(serviceParams);

    return new Response(JSON.stringify(summariesDto), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Caught unexpected error in GET /api/summaries handler:", error);
    return new Response(JSON.stringify({ message: "An internal server error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// --- Handler endpoint POST /api/summaries ---
// Implements the Create New Summary endpoint.
// Uses Zod for validation and DEFAULT_USER_ID as per MVP rules for THIS endpoint.
// Authentication check is skipped as per instruction.
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

  let requestBody: unknown;

  try {
    requestBody = await context.request.json();
  } catch (error) {
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
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const validatedData = validationResult.data;

    // --- Use DEFAULT_USER_ID ---
    // This endpoint assigns data to the DEFAULT_USER_ID as per specific MVP instruction,
    // rather than using the authenticated user's ID.
    // Authentication check is skipped.
    const userIdToAssign = DEFAULT_USER_ID;

    console.log(
      `POST /api/summaries: Validation successful for data assigned to user ID: ${userIdToAssign}. Proceeding to database insertion.`
    );

    // --- Prepare data and call Repository ---
    const dataToInsert: MeetingSummaryInsertData = {
      user_id: userIdToAssign,
      file_name: validatedData.file_name,
      transcription: validatedData.transcription,
      summary: validatedData.summary,
      llm_generated: validatedData.llm_generated,
      notes: validatedData.notes && validatedData.notes.length > 0 ? validatedData.notes : null,
      title:
        validatedData.file_name && validatedData.file_name.trim().length > 0
          ? validatedData.file_name.trim()
          : `Summary created on ${new Date().toLocaleString()}`,
    };

    const { data: newSummaryRecord, error: dbError } = await insertSummaryIntoDB(supabase, dataToInsert);

    // --- Handle Repository Response and DB Errors ---
    if (dbError) {
      console.error("POST /api/summaries: Error inserting summary into database:", dbError);
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

    console.log("POST /api/summaries: Successfully created new summary record with ID:", newSummaryRecord.id);

    const responseData: CreateSummaryResponseDTO = {
      id: newSummaryRecord.id,
      user_id: newSummaryRecord.user_id,
      file_name: newSummaryRecord.file_name,
      created_at: newSummaryRecord.created_at,
      updated_at: newSummaryRecord.modified_at,
      transcription: newSummaryRecord.transcription,
      summary: newSummaryRecord.summary,
      llm_generated: newSummaryRecord.llm_generated,
      notes: newSummaryRecord.notes,
      title: newSummaryRecord.title,
    };

    return new Response(JSON.stringify(responseData), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        Location: `/api/summaries/${responseData.id}`,
      },
    });
  } catch (error) {
    console.error("POST /api/summaries: Caught unexpected error after validation:", error);
    return new Response(
      JSON.stringify({
        error: "An internal server error occurred.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// --- Placeholder Handlers for other methods (PUT, DELETE) ---
// These methods were not part of this implementation task.

// export const PUT: APIRoute = async ({ params, request, locals }) => { /* ... */ };
// export const DELETE: APIRoute = async ({ params, locals }) => { /* ... */ };
