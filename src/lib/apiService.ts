// src/lib/apiService.ts
// import { supabase } from "@/auth"; // No longer needed directly for API calls needing auth token
import type {
  // Import types for DTOs
  ListSummariesCommand,
  MeetingSummaryListEntryDto,
  MeetingSummaryDetailsDto,
  CreateSummaryRequestDTO,
  CreateSummaryResponseDTO,
  UpdateSummaryRequestDTO,
  GenerateSummaryCommand,
  GenerateSummaryResponseDto,
} from "@/types";

// Helper function for generic fetch calls
// IMPORTANT: This MVP version does NOT include the Authorization header.
// This is INSECURE for production API endpoints and violates the general API plan.
// This is done only to adhere to the specific MVP rule "Don't use any auth at the moment".
const fetchWithoutAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  console.warn(`apiService: Making insecure API call to ${url} without Authorization header (MVP ONLY).`);
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorDetail = `API Error: ${response.status}`;
    try {
      // Attempt to parse error body for more details
      const errorBody = await response.json();
      errorDetail = errorBody.message || errorBody.error || JSON.stringify(errorBody);
    } catch (e) {
      // If JSON parsing fails, just use status text
      errorDetail = `${response.status} ${response.statusText}`;
    }
    const error = new Error(`Request failed: ${errorDetail}`);
    // Attach status code for potential specific handling if needed
    (error as any).status = response.status;
    throw error;
  }

  return response;
};

export const apiService = {
  // GET /api/summaries
  async fetchSummaries(params: ListSummariesCommand): Promise<MeetingSummaryListEntryDto[]> {
    const queryParams = new URLSearchParams();
    if (params.from_dt) queryParams.append("from_dt", params.from_dt);
    if (params.to_dt) queryParams.append("to_dt", params.to_dt);
    queryParams.append("sort_by", params.sort_by);
    queryParams.append("sort_order", params.sort_order);

    const url = `/api/summaries?${queryParams.toString()}`;

    // Use fetchWithoutAuth as auth is skipped in backend handler for this MVP
    const response = await fetchWithoutAuth(url, { method: "GET" });
    return response.json() as Promise<MeetingSummaryListEntryDto[]>;
  },

  // GET /api/summaries/{id}
  async getSummaryDetails(id: string): Promise<MeetingSummaryDetailsDto> {
    const url = `/api/summaries/${id}`;
    // Use fetchWithoutAuth as auth is skipped in backend handler for this MVP
    const response = await fetchWithoutAuth(url, { method: "GET" });
    if (response.status === 404) {
      // Explicitly handle 404 from API
      throw new Error(`Summary with ID ${id} not found.`);
    }
    return response.json() as Promise<MeetingSummaryDetailsDto>;
  },

  // POST /api/summaries
  async createSummary(data: CreateSummaryRequestDTO): Promise<CreateSummaryResponseDTO> {
    const url = "/api/summaries";
    // Use fetchWithoutAuth as auth is skipped in backend handler for this MVP
    const response = await fetchWithoutAuth(url, {
      method: "POST",
      body: JSON.stringify(data),
    });
    // API returns 201 Created with the new resource body
    return response.json() as Promise<CreateSummaryResponseDTO>;
  },

  // PUT /api/summaries/{id}
  async updateSummary(id: string, data: UpdateSummaryRequestDTO): Promise<MeetingSummaryDetailsDto> {
    const url = `/api/summaries/${id}`;
    // Use fetchWithoutAuth as auth is skipped in backend handler for this MVP
    const response = await fetchWithoutAuth(url, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (response.status === 404) {
      throw new Error(`Summary with ID ${id} not found for update.`);
    }
    // API returns 200 OK with the updated resource body
    return response.json() as Promise<MeetingSummaryDetailsDto>;
  },

  // DELETE /api/summaries/{id}
  async deleteSummary(id: string): Promise<void> {
    const url = `/api/summaries/${id}`;
    // Use fetchWithoutAuth as auth is skipped in backend handler for this MVP
    const response = await fetchWithoutAuth(url, {
      method: "DELETE",
    });
    if (response.status === 204) {
      return; // Success (No Content)
    }
    if (response.status === 404) {
      throw new Error(`Summary with ID ${id} not found for deletion.`);
    }
    // If response is OK but not 204/404, maybe there's a body? Handle as error.
    let errorDetail = `API Error: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorDetail = errorBody.message || errorBody.error || errorDetail;
    } catch (e) {
      /* ignore */
    }
    throw new Error(`Delete failed unexpectedly: ${errorDetail}`);
  },

  // POST /api/generate-summary
  async generateSummary(data: GenerateSummaryCommand): Promise<GenerateSummaryResponseDto> {
    const url = "/api/generate-summary";
    // Use fetchWithoutAuth as auth is skipped in backend handler for this MVP
    const response = await fetchWithoutAuth(url, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (response.status === 500) {
      // Backend LLM errors are returned as 500 with a generic message
      throw new Error(`Failed to generate summary. Please try again.`); // Use a user-friendly message
    }
    return response.json() as Promise<GenerateSummaryResponseDto>;
  },
};
