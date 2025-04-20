# API Endpoint Implementation Plan: Create New Summary (`POST /api/summaries`)

## 1. Przegląd punktu końcowego
Punkt końcowy `POST /api/summaries` służy do tworzenia nowego rekordu podsumowania spotkania w bazie danych. Zgodnie z aktualnymi wytycznymi, rekord zostanie powiązany ze zdefiniowanym domyślnym użytkownikiem (`DEFAULT_USER_ID`) z pliku `src/db/supabase.client.ts`, a nie z aktualnie uwierzytelnionym użytkownikiem. Przyjmuje dane transkrypcji, podsumowania i inne metadane, waliduje je i wstawia nowy rekord do tabeli `meeting_summaries`.

## 2. Szczegóły żądania
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/summaries`
- **Parametry Query:** Brak
- **Request Body:** JSON object
  - **Wymagane pola:**
    - `transcription` (string): Pełna transkrypcja spotkania.
    - `summary` (string): Podsumowanie transkrypcji (max 500 znaków).
    - `llm_generated` (boolean): Flaga wskazująca, czy podsumowanie zostało wygenerowane przez LLM.
  - **Opcjonalne pola:**
    - `file_name` (string | null): Nazwa oryginalnego pliku, z którego pochodzi transkrypcja.
    - `notes` (string): Dodatkowe notatki użytkownika.

## 3. Wykorzystywane typy
- `@types/summary` (lub podobna referencja do definicji typów w projekcie):
  - `CreateSummaryRequestDTO`: Typ dla ciała żądania (`file_name`, `transcription`, `summary`, `llm_generated`, `notes`).
  - `MeetingSummaryDB`: Typ odpowiadający strukturze tabeli `meeting_summaries` w bazie danych (zawiera dodatkowo `id`, `user_id`, `created_at`, `modified_at`).
  - `CreateSummaryResponseDTO`: Typ dla ciała odpowiedzi sukcesu (201), zgodny ze specyfikacją API (zawiera `id`, `user_id`, `file_name`, `created_at`, `updated_at`, `transcription`, `summary`, `llm_generated`, `notes`). `updated_at` w odpowiedzi mapuje na `modified_at` z bazy danych.
- `SupabaseClient` z `src/db/supabase.client.ts`.

## 4. Szczegóły odpowiedzi
- **Sukces (201 Created):**
  - Ciało odpowiedzi: JSON object (`CreateSummaryResponseDTO`) zawierający pełne dane nowo utworzonego rekordu, w tym ID nadane przez bazę danych, ID użytkownika (`DEFAULT_USER_ID`) oraz daty utworzenia i modyfikacji.
- **Błędy:**
  - `400 Bad Request`: Nieprawidłowe dane wejściowe (np. brak wymaganego pola, nieprawidłowy typ danych, pole `summary` przekracza 500 znaków). Ciało odpowiedzi powinno zawierać informacje o błędzie walidacji.
  - `401 Unauthorized`: Wymagane uwierzytelnienie. Chociaż endpoint używa `DEFAULT_USER_ID`, status 401 może być zwrócony, jeśli wymagana jest *jakakolwiek* forma uwierzytelnienia na poziomie route (np. middleware), która nie jest spełniona. *Należy jednak zauważyć potencjalny konflikt z założeniem używania `DEFAULT_USER_ID` zamiast autentykacji.*
  - `500 Internal Server Error`: Wystąpił nieoczekiwany błąd po stronie serwera (np. błąd bazy danych, w tym błędy związane z politykami RLS).

## 5. Przepływ danych
1.  Żądanie `POST /api/summaries` trafia do backendu (Astro route handler).
2.  Handler próbuje pobrać obiekt `supabase` z `context.locals`. Jeśli `supabase` nie jest dostępne, zwraca `500 Internal Server Error`.
3.  Handler odczytuje ciało żądania JSON.
4.  Handler waliduje dane wejściowe z ciała żądania:
    *   Sprawdza obecność i typy wymaganych pól (`transcription`, `summary`, `llm_generated`).
    *   Sprawdza typy opcjonalnych pól (`file_name`, `notes`).
    *   Sprawdza, czy pole `summary` nie przekracza 500 znaków.
    *   Jeśli walidacja zakończy się niepowodzeniem, zwraca `400 Bad Request` z informacją o błędzie.
5.  Handler pobiera domyślny identyfikator użytkownika z `DEFAULT_USER_ID` z pliku `src/db/supabase.client.ts`. **(Uwaga: Pomijany jest krok pobierania ID uwierzytelnionego użytkownika z Supabase Auth).**
6.  Przygotowuje obiekt danych do wstawienia do bazy danych, mapując pola z request body i dodając `user_id` równe `DEFAULT_USER_ID`. Pola `created_at` i `modified_at` w DB będą automatycznie ustawione przez bazę danych (`DEFAULT NOW()`).
7.  Wywołuje funkcję repository (np. `summariesRepository.createSummary`), przekazując przygotowane dane. Ta funkcja używa klienta `supabase` do wykonania zapytania `INSERT` do tabeli `meeting_summaries`. Zapytanie jawnie użyje `DEFAULT_USER_ID` dla kolumny `user_id`.
8.  Supabase i PostgreSQL wykonują INSERT. **(Uwaga: Istnieje wysokie ryzyko, że polityki RLS na poziomie bazy danych, takie jak `insert_meeting_summaries ON meeting_summaries FOR INSERT WITH CHECK (user_id = auth.uid());`, spowodują błąd, ponieważ `user_id` w wierszu do wstawienia (`DEFAULT_USER_ID`) prawdopodobnie nie będzie zgodny z `auth.uid()` w kontekście żądania bazy danych, chyba że RLS jest wyłączone lub zmodyfikowane).**
9.  Po udanym wstawieniu, Supabase zwraca wstawiony rekord (włączając w to `id`, `created_at`, `modified_at`).
10. Funkcja repository zwraca utworzony rekord do handlera.
11. Handler mapuje dane z rekordu bazy danych (`MeetingSummaryDB`) na format odpowiedzi API (`CreateSummaryResponseDTO`), zamieniając `modified_at` na `updated_at`.
12. Handler zwraca `201 Created` wraz z utworzonym obiektem w ciele odpowiedzi.
13. Jeśli w trakcie interakcji z bazą danych wystąpi błąd (np. błąd RLS, błąd połączenia), handler przechwytuje wyjątek i zwraca `500 Internal Server Error`, logując szczegóły błędu po stronie serwera.

## 6. Względy bezpieczeństwa
- **Uwierzytelnienie/Autoryzacja:** Zgodnie z wytycznymi, ten endpoint *nie* wykorzystuje standardowego przepływu autentykacji Supabase dla identyfikacji użytkownika. Wszelkie dane wstawione przez ten endpoint zostaną przypisane do `DEFAULT_USER_ID`. **Jest to znaczące odstępstwo od specyfikacji API ("for the authenticated user") i modelu bezpieczeństwa opartego na RLS powiązanym z `auth.uid()`.**
- **Konflikt z RLS:** Jeśli polityki RLS na tabeli `meeting_summaries` są aktywne (jak sugeruje schemat bazy danych), próba wstawienia rekordu z jawnie podanym `DEFAULT_USER_ID` (który nie jest powiązany z `auth.uid()` kontekstu bazy danych) najprawdopodobniej zakończy się błędem uprawnień na poziomie bazy danych. Aby ten endpoint działał z `DEFAULT_USER_ID`, polityki RLS dla operacji INSERT na tabeli `meeting_summaries` mogą wymagać tymczasowego wyłączenia lub zmiany, co **stanowczo odradza się w środowisku produkcyjnym dla danych użytkowników** z uwagi na potencjalne luki w bezpieczeństwie.
- **Walidacja Danych:** Walidacja danych wejściowych w handlerze API pozostaje ważna, aby zapobiegać wstawianiu niepoprawnych danych.
- **Ochrona przed SQL Injection:** Użycie klienta Supabase i parametryzowanych zapytań chroni przed SQL injection.

## 7. Obsługa błędów
- Wczesna walidacja danych wejściowych powinna wychwycić błędy `400 Bad Request`. Odpowiedź powinna zawierać wystarczającą informację dla klienta o przyczynie błędu (np. lista nieprawidłowych pól).
- **Błędy bazy danych (w tym RLS):** Błędy wynikające z próby wstawienia danych z `DEFAULT_USER_ID` w sytuacji, gdy polityki RLS oparte na `auth.uid()` są aktywne, objawią się jako błędy na poziomie bazy danych. Powinny one zostać przechwycone przez blok `try...catch` w handlerze API i zwrócone jako `500 Internal Server Error`. Należy logować szczegóły tych błędów po stronie serwera, aby ułatwić diagnozę problemów z konfiguracją RLS lub użyciem `DEFAULT_USER_ID`.
- Inne nieoczekiwane błędy serwera również powinny skutkować odpowiedzią `500 Internal Server Error`.

## 8. Etapy wdrożenia
1.  Utworzenie lub modyfikacja pliku route handler dla endpointa (np. `src/pages/api/summaries.ts`).
2.  Zdefiniowanie lub weryfikacja typów danych dla żądania, odpowiedzi i modelu DB (`CreateSummaryRequestDTO`, `CreateSummaryResponseDTO`, `MeetingSummaryDB`) w odpowiednim miejscu (np. `src/types/summary.ts`).
3.  Implementacja walidacji danych wejściowych w handlerze API (sprawdzenie pól wymaganych, typów, max długości `summary`). Zwrócenie `400 Bad Request` w przypadku błędu walidacji.
4.  Pobranie klienta Supabase z `context.locals.supabase`. Należy użyć typu `SupabaseClient` z `src/db/supabase.client.ts`.
5.  Pobranie `DEFAULT_USER_ID` z pliku `src/db/supabase.client.ts`. **(Krok pomijający weryfikację autentykacji użytkownika).**
6.  Implementacja funkcji repository do wstawiania danych do tabeli `meeting_summaries` (np. w `src/db/summariesRepository.ts`), korzystającej z klienta Supabase i jawnie przekazującej `DEFAULT_USER_ID` jako wartość kolumny `user_id` w zapytaniu INSERT.
7.  Wywołanie funkcji repository z handlera, przekazując zwalidowane dane i `DEFAULT_USER_ID`.
8.  Obsługa odpowiedzi z repository: mapowanie na `CreateSummaryResponseDTO` i zwrócenie `201 Created` w przypadku sukcesu.
9.  Implementacja bloku `try...catch` w handlerze do przechwytywania potencjalnych błędów (szczególnie związanych z RLS lub DB), logowanie ich i zwracanie `500 Internal Server Error`.
10. Przetestowanie endpointa przy użyciu narzędzi takich jak Postman lub cURL, weryfikując scenariusze sukcesu i błędów walidacji/serwera. **Szczególną uwagę należy zwrócić na błędy 500, które mogą wynikać z konfliktów z politykami RLS opartymi na `auth.uid()` przy użyciu `DEFAULT_USER_ID`.**
11. W razie wystąpienia błędów RLS, skonsultować z zespołem ds. bazy danych/Supabase w celu podjęcia decyzji o konfiguracji RLS lub powrocie do modelu opartego na autentykacji.
12. Utworzenie i przegląd kodu (Code Review), zwracając szczególną uwagę na implikacje użycia `DEFAULT_USER_ID` dla bezpieczeństwa.
13. Wdrożenie na środowisko testowe/produkcyjne, mając pełną świadomość ograniczeń i ryzyk związanych z użyciem `DEFAULT_USER_ID`.