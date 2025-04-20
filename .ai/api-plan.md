# REST API Plan

## 1. Resources

*   **`meeting_summaries`**: Represents a single meeting transcription and its associated summary, notes, and metadata. Corresponds to the `meeting_summaries` table in the database.
*   **`users`**: Represents a user account. Managed by Supabase Auth. API interactions for user management (signup, login, etc.) are handled directly by the Supabase client library or SDK and are not included in this custom API plan. Access to `meeting_summaries` resources requires user authentication.

## 2. Endpoints

### 2.1. `meeting_summaries` Resource

#### List Summaries

*   **HTTP Method:** `GET`
*   **URL Path:** `/api/summaries`
*   **Description:** Retrieves a list of meeting summaries belonging to the authenticated user, with optional filtering by creation date and sorting. By default, if no date parameters are provided, it retrieves summaries from the last 7 days.
*   **Query Parameters:**
    *   `sort_by`: string (default: `created_at`) - The column to sort by (`created_at` or `updated_at`).
    *   `sort_order`: string (default: `desc`) - The sort direction (`asc` or `desc`). Defaults satisfy the PRD requirement for sorting by creation date (newest first).
    *   `from_dt`: string (optional) - Filter summaries created on or after this timestamp. Expected format compatible with `TIMESTAMP WITH TIME ZONE` (e.g., ISO 8601).
    *   `to_dt`: string (optional) - Filter summaries created on or before this timestamp. Expected format compatible with `TIMESTAMP WITH TIME ZONE` (e.g., ISO 8601).
    *   **Note:** If *neither* `from_dt` nor `to_dt` is provided, the API will default to filtering for records where `created_at` is within the last 7 days from the current server time (`created_at >= NOW() - INTERVAL '7 days' AND created_at <= NOW()`). If only one is provided, it will filter based on that one. If both are provided, it will filter based on the provided range.
*   **Request Payload:** None
*   **Response Payload:**
    ```json
    [
      {
        "id": "uuid",
        "file_name": "string | null",
        "created_at": "timestamp with time zone",
        "updated_at": "timestamp with time zone"
        // Summary content is NOT included in the list view response for brevity and performance, as per list table requirements in PRD
      },
      // ... more summary objects
    ]
    ```
*   **Success Responses:**
    *   `200 OK`: Successfully retrieved the list of summaries.
*   **Error Responses:**
    *   `400 Bad Request`: Invalid query parameters (e.g., invalid date format).
    *   `401 Unauthorized`: Authentication required.
    *   `500 Internal Server Error`: An error occurred on the server.

#### Get Summary Details

*   **HTTP Method:** `GET`
*   **URL Path:** `/api/summaries/{id}`
*   **Description:** Retrieves the full details of a specific meeting summary by its ID. Access is restricted to the owner of the summary via RLS. This endpoint includes the full transcription and summary to support the edit functionality required by the PRD.
*   **Query Parameters:** None
*   **Request Payload:** None
*   **Response Payload:**
    ```json
    {
      "id": "uuid",
      "file_name": "string | null",
      "created_at": "timestamp with time zone",
      "updated_at": "timestamp with time zone",
      "transcription": "string",
      "summary": "string",
      "llm_generated": "boolean",
      "notes": "string"
      // user_id is excluded from the response as RLS ensures the user owns the data.
    }
    ```
*   **Success Responses:**
    *   `200 OK`: Successfully retrieved summary details.
*   **Error Responses:**
    *   `401 Unauthorized`: Authentication required.
    *   `403 Forbidden`: User is not the owner of the summary (enforced by RLS).
    *   `404 Not Found`: Summary with the provided ID does not exist for this user.
    *   `500 Internal Server Error`: An error occurred on the server.

#### Create New Summary

*   **HTTP Method:** `POST`
*   **URL Path:** `/api/summaries`
*   **Description:** Creates a new meeting summary record in the database for the authenticated user.
*   **Query Parameters:** None
*   **Request Payload:**
    ```json
    {
      "file_name": "string | null", // Optional, name of the uploaded file
      "transcription": "string",     // Required
      "summary": "string",           // Required, max 500 characters
      "llm_generated": "boolean",    // Required - indicates if the submitted summary came from LLM generation (true) or manual input (false)
      "notes": "string"              // Optional, can be empty string
      // API sets user_id based on authenticated user, created_at, updated_at
    }
    ```
*   **Response Payload:**
    ```json
    {
      "id": "uuid", // ID of the newly created summary
      "user_id": "uuid", // Included for context upon creation
      "file_name": "string | null",
      "created_at": "timestamp with time zone",
      "updated_at": "timestamp with time zone",
      "transcription": "string",
      "summary": "string",
      "llm_generated": "boolean",
      "notes": "string"
    }
    ```
*   **Success Responses:**
    *   `201 Created`: Summary successfully created.
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input data (e.g., missing required fields, summary exceeds 500 characters).
    *   `401 Unauthorized`: Authentication required.
    *   `500 Internal Server Error`: An error occurred on the server.

#### Update Existing Summary

*   **HTTP Method:** `PUT`
*   **URL Path:** `/api/summaries/{id}`
*   **Description:** Updates an existing meeting summary record. Access is restricted to the owner of the summary via RLS.
*   **Query Parameters:** None
*   **Request Payload:**
    ```json
    {
      "file_name": "string | null", // Can update file name
      "transcription": "string",     // Can update transcription
      "summary": "string",           // Can update summary, max 500 characters
      "llm_generated": "boolean",    // Required - indicates if the submitted summary is currently LLM generated (true) or manually edited (false)
      "notes": "string"              // Can update notes
      // API updates updated_at. user_id and created_at are immutable.
    }
    ```
*   **Response Payload:**
    ```json
    {
      "id": "uuid", // ID of the updated summary
      "user_id": "uuid", // Included for context
      "file_name": "string | null",
      "created_at": "timestamp with time zone",
      "updated_at": "timestamp with time zone",
      "transcription": "string",
      "summary": "string",
      "llm_generated": "boolean",
      "notes": "string"
    }
    ```
*   **Success Responses:**
    *   `200 OK`: Summary successfully updated.
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input data (e.g., missing required fields, summary exceeds 500 characters).
    *   `401 Unauthorized`: Authentication required.
    *   `403 Forbidden`: User is not the owner of the summary (enforced by RLS).
    *   `404 Not Found`: Summary with the provided ID does not exist for this user.
    *   `500 Internal Server Error`: An error occurred on the server.

#### Delete Summary

*   **HTTP Method:** `DELETE`
*   **URL Path:** `/api/summaries/{id}`
*   **Description:** Deletes an existing meeting summary record. Access is restricted to the owner of the summary via RLS.
*   **Query Parameters:** None
*   **Request Payload:** None
*   **Response Payload:** None
*   **Success Responses:**
    *   `204 No Content`: Summary successfully deleted.
*   **Error Responses:**
    *   `401 Unauthorized`: Authentication required.
    *   `403 Forbidden`: User is not the owner of the summary (enforced by RLS).
    *   `404 Not Found`: Summary with the provided ID does not exist for this user.
    *   `500 Internal Server Error`: An error occurred on the server.

### 2.2. LLM Generation Action

#### Generate Summary

*   **HTTP Method:** `POST`
*   **URL Path:** `/api/generate-summary`
*   **Description:** Triggers the LLM to generate a summary based on the provided transcription text. This endpoint does *not* save data to the database; it returns the generated summary to the client for review and potential editing before saving. Authentication is required.
*   **Query Parameters:** None
*   **Request Payload:**
    ```json
    {
      "transcription": "string" // The transcription text to summarize
    }
    ```
*   **Response Payload:**
    ```json
    {
      "summary": "string" // The summary text generated by the LLM (guaranteed to be <= 500 characters after processing)
    }
    ```
*   **Success Responses:**
    *   `200 OK`: Successfully generated a summary.
*   **Error Responses:**
    *   `400 Bad Request`: Missing or empty transcription in the request.
    *   `401 Unauthorized`: Authentication required.
    *   `500 Internal Server Error`: An error occurred during LLM communication or processing. The error message should be generic as per PRD, with details logged server-side.

## 3. Authentication and Authorization

*   **Authentication Mechanism:** Supabase Auth (JWT-based). Users authenticate via the Supabase client SDK, obtaining a JWT. This token is sent in the `Authorization: Bearer <token>` header for all API requests to protected endpoints (`/api/*`).
*   **Authorization Mechanism:** PostgreSQL Row Level Security (RLS), managed via Supabase. The RLS policies defined in the database schema (e.g., `user_id = auth.uid()` for SELECT, INSERT, UPDATE, DELETE on `meeting_summaries`) ensure that users can only access and modify their own records. Supabase automatically sets the `auth.uid()` function result based on the authenticated user's JWT.

## 4. Validation and Business Logic

*   **Input Validation (on `POST /api/summaries` and `PUT /api/summaries/{id}`):**
    *   `transcription`: Required, must be a non-empty string.
    *   `summary`: Required, must be a non-empty string and not exceed 500 characters.
    *   `llm_generated`: Required, must be a boolean.
    *   `notes`: Optional, must be a string (can be empty).
    *   `file_name`: Optional, must be a string or null.
*   **Input Validation (on `POST /api/generate-summary`):**
    *   `transcription`: Required, must be a non-empty string.
*   **Input Validation (on `GET /api/summaries` query parameters):**
    *   `from_dt`, `to_dt`: If provided, must be valid timestamp strings parsable by the backend/database. `sort_by` and `sort_order` must be valid values.
*   **Business Logic Implementation:**
    *   **User Assignment:** The API layer (or RLS on INSERT) automatically sets the `user_id` for new `meeting_summaries` records based on the authenticated user's ID (`auth.uid()`).
    *   **Timestamping:** The database (using default `NOW()` or triggered by the API) sets `created_at` on creation (`POST`) and updates `updated_at` on both creation (`POST`) and update (`PUT`).
    *   **LLM Integration:** The `POST /api/generate-summary` endpoint orchestrates the call to the external LLM API, formats the prompt, sends the transcription, processes the response, and ensures the returned summary adheres to the <= 500 character limit (e.g., via prompt engineering or truncation).
    *   **Data Isolation:** RLS policies effectively filter all queries (`SELECT`, `UPDATE`, `DELETE`) to ensure only records matching the authenticated user's `user_id` are affected. The `INSERT` policy (`WITH CHECK`) ensures new records are correctly tagged with the user's ID.
    *   **List Sorting & Filtering:** The `GET /api/summaries` endpoint implements sorting and filtering logic. If `from_dt` and `to_dt` are *not* provided, it defaults the filtering range to `created_at BETWEEN NOW() - INTERVAL '7 days' AND NOW()`. If one or both are provided, it uses the provided range. Sorting is applied based on `sort_by` and `sort_order`, defaulting to `created_at DESC`.
    *   **Error Handling:** The API catches errors (database errors, LLM errors, validation errors) and returns appropriate HTTP status codes (400, 401, 403, 404, 500) with generic error messages to the client. Detailed error information is logged server-side as required by the PRD.

## 5. Security Considerations

*   **Authentication & Authorization (RLS):** As described above, Supabase Auth and RLS are the primary security mechanisms preventing unauthorized access and ensuring data isolation between users.
*   **Rate Limiting:** Implementing rate limiting on the `POST /api/generate-summary` endpoint is crucial to manage costs associated with LLM API calls and protect against abuse. This would typically be configured at the API gateway or serverless function level.
*   **Input Sanitization:** While not explicitly detailed in the plan, all user-provided text inputs (`transcription`, `summary`, `notes`, `file_name`) must be properly sanitized on the backend to prevent injection attacks (e.g., SQL injection, although RLS helps mitigate database risks, sanitization is good practice).
*   **`file_name` Uniqueness:** The current schema/API does not enforce `file_name` uniqueness *per user*. While not a security vulnerability, it's a potential usability issue (users might get confused saving multiple summaries with the same generated file name). A unique constraint per user (`UNIQUE (user_id, file_name)`) could be added to the database schema, which the API would then need to handle on `POST`/`PUT` requests (returning a `409 Conflict` if violated). This is considered a future enhancement beyond the strict MVP described.
