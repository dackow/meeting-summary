/* eslint-disable no-console */
// src/pages/api/summaries.ts

import type { APIRoute } from "astro";
// Import the Zod library
import { z } from "zod";

// Import your local SupabaseClient type alias AND the default user ID
import { type SupabaseClient, DEFAULT_USER_ID } from "../../db/supabase.client";

// Import DTOs/Commands (Database type is no longer needed directly here)
// Ensure MeetingSummaryListEntryDto is imported from the updated types.ts
import type { MeetingSummaryListEntryDto } from "../../types";

// --- Zod Schema for List Summaries Query Parameters ---
// Define the schema based on the ListSummariesCommand interface and API plan
const listSummariesParamsSchema = z.object({
  // sort_by is optional, must be 'created_at' or 'updated_at', defaults to 'created_at'
  sort_by: z.enum(["created_at", "updated_at"]).optional().default("created_at"),
  // sort_order is optional, must be 'asc' or 'desc', defaults to 'desc'
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
  // from_dt is optional, must be a valid ISO 8601 datetime string
  from_dt: z.string().datetime({ message: "Invalid ISO 8601 date format for 'from_dt'." }).optional(),
  // to_dt is optional, must be a valid ISO 8601 datetime string
  to_dt: z.string().datetime({ message: "Invalid ISO 8601 date format for 'to_dt'." }).optional(),
});

// Define the inferred type from the schema to ensure consistency
type ListSummariesParsedParams = z.infer<typeof listSummariesParamsSchema>;

// --- SummaryService Class ---
class SummaryService {
  // Use the imported SupabaseClient type alias
  constructor(private supabase: SupabaseClient) {}

  async listUserSummaries(
    userId: string, // userId is now passed from the handler (will be DEFAULT_USER_ID)
    dateRange: { from?: Date; to?: Date },
    sortParams: {
      by: ListSummariesParsedParams["sort_by"] | "modified_at";
      order: ListSummariesParsedParams["sort_order"];
    }
  ): Promise<MeetingSummaryListEntryDto[]> {
    try {
      let query = this.supabase
        .from("meeting_summaries")
        // Include the new 'title' column in the select statement
        .select("id, title, file_name, created_at, modified_at") // <-- Added 'title'
        // Explicitly filter by the provided user ID
        .eq("user_id", userId);

      // Apply date filtering if dates are provided (now as Date objects)
      if (dateRange.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte("created_at", dateRange.to.toISOString());
      }

      // Apply sorting
      // Note: Sorting by API's 'updated_at' uses DB's 'modified_at'
      const dbSortBy = sortParams.by === "updated_at" ? "modified_at" : sortParams.by;
      query = query.order(dbSortBy, { ascending: sortParams.order === "asc" });

      const { data, error } = await query;

      if (error) {
        // Log the specific user ID for debugging
        console.error("Database error fetching summaries for user", userId, ":", error);
        throw new Error("Failed to fetch summaries from database.");
      }

      // Map database rows to DTOs
      const summariesDto: MeetingSummaryListEntryDto[] = data.map((row) => ({
        id: row.id,
        title: row.title, // <-- Map the new 'title' field
        file_name: row.file_name,
        created_at: row.created_at,
        updated_at: row.modified_at,
      }));

      return summariesDto;
    } catch (error) {
      console.error("Error in SummaryService:", error);
      throw error;
    }
  }
}

// --- Handler endpoint GET /api/summaries ---
export const GET: APIRoute = async ({ url, locals }) => {
  const supabase = locals.supabase as SupabaseClient;

  // --- Use Static User ID for MVP ---
  // Authentication check is removed for MVP based on previous plan
  const userId = DEFAULT_USER_ID;

  // --- Use Zod for parameter validation ---
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const validationResult = listSummariesParamsSchema.safeParse(queryParams);

  // Handle validation errors
  if (!validationResult.success) {
    console.error("Query parameter validation failed:", validationResult.error);
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

  // Get the validated parameters with defaults applied
  const validatedParams = validationResult.data;

  // --- Determine Date Range ---
  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  // If neither from_dt nor to_dt were provided, default to last 7 days
  if (validatedParams.from_dt === undefined && validatedParams.to_dt === undefined) {
    const now = new Date();
    toDate = now;
    fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
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
  const dbSortBy = validatedParams.sort_by === "updated_at" ? "modified_at" : validatedParams.sort_by;

  // --- Integrate with the SummaryService and return response ---
  try {
    const summaryService = new SummaryService(supabase);

    // Pass the static userId, date range, and sort parameters to the service
    const summariesDto: MeetingSummaryListEntryDto[] = await summaryService.listUserSummaries(
      userId,
      { from: fromDate, to: toDate },
      { by: dbSortBy, order: validatedParams.sort_order }
    );

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

// --- Placeholder Handlers for other methods (POST, PUT, DELETE) ---
// These would need to be implemented based on the API plan, handling
// title in their respective Zod schemas and DB operations.

// export const POST: APIRoute = async ({ request, locals }) => { /* ... */ };
// export const PUT: APIRoute = async ({ params, request, locals }) => { /* ... */ };
// export const DELETE: APIRoute = async ({ params, locals }) => { /* ... */ };
