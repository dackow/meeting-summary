// src/types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Ensure Database type from database.types.ts is correctly imported or referenced.
// It should now include 'title: string' in meeting_summaries.Row.

// Assuming database.types.ts is correctly generated and MeetingSummaryRow
// now includes 'title: string':
import { type Database } from "./db/database.types"; // Make sure this import is present

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;

// Koniec importĂłw podstawowych typĂłw bazy danych

// Typ pomocniczy reprezentujÄ…cy wiersz tabeli meeting_summaries dla Ĺ‚atwiejszego odwoĹ‚ywania siÄ™
type MeetingSummaryRow = Tables<"meeting_summaries">;

/**
 * Command Model dla zapytania listy podsumowaĹ„ spotkaĹ„ (GET /api/summaries).
 * Reprezentuje parametry zapytania HTTP.
 */
export interface ListSummariesCommand {
  /** Kolumna do sortowania (domyĹ›lnie 'created_at'). */
  sort_by?: "created_at" | "updated_at";
  /** Kierunek sortowania (domyĹ›lnie 'desc'). */
  sort_order?: "asc" | "desc";
  /** Filtruj podsumowania utworzone od lub po tej dacie/czasie (ISO 8601). */
  from_dt?: string;
  /** Filtruj podsumowania utworzone przed lub do tej daty/czasu (ISO 8601). */
  to_dt?: string;
}

/**
 * DTO reprezentujÄ…ce pojedynczy element na liĹ›cie podsumowaĹ„ (GET /api/summaries).
 * Zawiera tylko podstawowe informacje dla widoku listy.
 * Mapuje siÄ™ na podzbiĂłr pĂłl MeetingSummaryRow, z modified_at zmienionym na updated_at,
 * i DODANO title.
 */
export type MeetingSummaryListEntryDto = Pick<MeetingSummaryRow, "id" | "title" | "file_name" | "created_at"> & {
  /** Czas ostatniej modyfikacji, odpowiada modified_at w DB. */
  updated_at: MeetingSummaryRow["modified_at"];
};

/**
 * DTO reprezentujÄ…ce odpowiedĹş z listy podsumowaĹ„ spotkaĹ„ (GET /api/summaries).
 */
export type MeetingSummaryListDto = MeetingSummaryListEntryDto[];

/**
 * DTO reprezentujÄ…ce szczegĂłĹ‚owe informacje o podsumowaniu (GET /api/summaries/{id}).
 * Zawiera wszystkie pola z wyjÄ…tkiem user_id, z modified_at zmienionym na updated_at,
 * i DODANO title.
 * RLS w bazie danych zapewnia, ĹĽe tylko wĹ‚aĹ›ciciel ma dostÄ™p.
 */
export type MeetingSummaryDetailsDto = Omit<
  MeetingSummaryRow,
  "user_id" | "modified_at" // user_id jest pomijane w odpowiedzi API, modified_at jest zwracane jako updated_at
> & {
  /** Czas ostatniej modyfikacji, odpowiada modified_at w DB. */
  updated_at: MeetingSummaryRow["modified_at"];
};

/**
 * Command Model dla tworzenia nowego podsumowania (POST /api/summaries).
 * Reprezentuje dane wejĹ›ciowe od klienta.
 * WymagalnoĹ›Ä‡ pĂłl odzwierciedla wymagania API, nie DB Insert typu.
 * DODANO title jako opcjonalne pole.
 */
export type CreateMeetingSummaryCommand = Required<
  Pick<
    MeetingSummaryRow,
    "transcription" | "summary" | "llm_generated" // Pola wymagane przez API
  >
> &
  Partial<
    Pick<
      MeetingSummaryRow,
      "title" | "notes" | "file_name" // Pola opcjonalne w API, title dodane
    >
  >;

/**
 * DTO reprezentujÄ…ce odpowiedĹş po utworzeniu nowego podsumowania (POST /api/summaries).
 * Zwraca peĹ‚ny obiekt podsumowania, w tym pola ustawione przez serwer/bazÄ™ danych.
 * Odpowiada strukturze MeetingSummaryRow, z modified_at zmienionym na updated_at,
 * i DODANO title.
 */
export type CreateMeetingSummaryResponseDto = Omit<
  MeetingSummaryRow,
  "modified_at" // modified_at jest zwracane jako updated_at
> & {
  /** Czas ostatniej modyfikacji, odpowiada modified_at w DB. */
  updated_at: MeetingSummaryRow["modified_at"];
};

/**
 * Command Model dla aktualizacji istniejÄ…cego podsumowania (PUT /api/summaries/{id}).
 * Reprezentuje dane wejĹ›ciowe od klienta.
 * WymagalnoĹ›Ä‡ pĂłl odzwierciedla wymagania API, nie DB Update typu.
 * DODANO title jako opcjonalne pole.
 */
export type UpdateMeetingSummaryCommand = Required<
  Pick<
    MeetingSummaryRow,
    "llm_generated" // llm_generated jest wymagane w API PUT
  >
> &
  Partial<
    Pick<
      MeetingSummaryRow,
      "title" | "file_name" | "transcription" | "summary" | "notes" // Pola opcjonalne w API PUT, title dodane
    >
  >;

/**
 * DTO reprezentujÄ…ce odpowiedĹş po aktualizacji podsumowania (PUT /api/summaries/{id}).
 * Struktura taka sama jak CreateMeetingSummaryResponseDto, DODANO title.
 */
export type UpdateMeetingSummaryResponseDto = CreateMeetingSummaryResponseDto;

/**
 * Command Model dla ĹĽÄ…dania generowania podsumowania przez LLM (POST /api/generate-summary).
 * Reprezentuje dane wejĹ›ciowe dla akcji.
 */
export interface GenerateSummaryCommand {
  /** Tekst transkrypcji do podsumowania. */
  transcription: string;
}

/**
 * DTO reprezentujÄ…ce odpowiedĹş z wygenerowanym podsumowaniem przez LLM (POST /api/generate-summary).
 * Reprezentuje dane wyjĹ›ciowe akcji.
 */
export interface GenerateSummaryResponseDto {
  /** Wygenerowany tekst podsumowania. */
  summary: string;
}

// Uwaga: Endpoint DELETE /api/summaries/{id} zwraca 204 No Content,
// wiÄ™c nie wymaga definiowania DTO odpowiedzi.