# API Endpoint Implementation Plan: Generate Summary (`POST /api/generate-summary`)

## 1. Przegląd punktu końcowego
Punkt końcowy `POST /api/generate-summary` służy do wywołania modelu dużego języka (LLM) w celu stworzenia podsumowania dostarczonego tekstu transkrypcji. Endpoint ten **nie zapisuje żadnych danych w bazie danych**; jego jedynym zadaniem jest przetworzenie tekstu transkrypcji przez LLM i zwrócenie wygenerowanego podsumowania do klienta. Endpoint wymaga uwierzytelnienia.

## 2. Szczegóły żądania
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/generate-summary`
- **Parametry Query:** Brak
- **Request Body:** JSON object
  - **Wymagane pola:**
    - `transcription` (string): Tekst transkrypcji do podsumowania. Musi być niepustym stringiem.
  - **Opcjonalne pola:** Brak.

## 3. Wykorzystywane typy
- `../../types`:
    - `GenerateSummaryCommand`: Typ dla ciała żądania (request body), zawierający pole `transcription`.
    - `GenerateSummaryResponseDto`: Typ dla ciała odpowiedzi sukcesu (200 OK), zawierający pole `summary`.
- `zod`: Biblioteka do walidacji danych wejściowych. Zdefiniowany zostanie schemat Zod odpowiadający `GenerateSummaryCommand`.
- `SupabaseClient` z `src/db/supabase.client.ts`: Do weryfikacji uwierzytelnienia użytkownika.

## 4. Szczegóły odpowiedzi
- **Sukces (200 OK):**
  - Ciało odpowiedzi: JSON object (`GenerateSummaryResponseDto`) zawierający wygenerowane podsumowanie w polu `summary`. Tekst podsumowania będzie ograniczony do maksymalnie 500 znaków.
- **Błędy:**
  - `400 Bad Request`: Nieprawidłowe dane wejściowe (np. brak pola `transcription`, `transcription` jest puste lub nie jest stringiem). Ciało odpowiedzi powinno zawierać informacje o błędzie walidacji.
  - `401 Unauthorized`: Wymagane uwierzytelnienie. Użytkownik nie jest zalogowany lub token autentykacji jest nieprawidłowy.
  - `500 Internal Server Error`: Wystąpił nieoczekiwany błąd po stronie serwera (np. błąd komunikacji z API LLM, błąd podczas przetwarzania odpowiedzi LLM). Ciało odpowiedzi powinno zawierać generyczny komunikat o błędzie serwera.

## 5. Przepływ danych
1.  Żądanie `POST /api/generate-summary` trafia do backendu (Astro route handler).
2.  Handler próbuje pobrać obiekt `supabase` z `context.locals`. Jeśli `supabase` nie jest dostępne, zwraca `500 Internal Server Error`.
3.  Handler weryfikuje, czy użytkownik jest uwierzytelniony przy użyciu `supabase.auth.getUser()`. Jeśli nie, zwraca `401 Unauthorized`.
4.  Handler odczytuje ciało żądania JSON.
5.  Handler waliduje ciało żądania przy użyciu schematu Zod (`createGenerateSummaryRequestSchema`), upewniając się, że `transcription` jest niepustym stringiem. Jeśli walidacja zakończy się niepowodzeniem, zwraca `400 Bad Request` z informacją o błędzie walidacji.
6.  Z zwalidowanych danych wejściowych wyodrębnia tekst transkrypcji.
7.  Wywołuje funkcję w warstwie serwisowej (np. `SummaryService.generateSummary`) przekazując transkrypcję. Zgodnie z regułami implementacji, ta funkcja użyje mockowej implementacji LLM.
8.  Funkcja serwisowa (lub dedykowana mockowa funkcja LLM) przetwarza transkrypcję (np. zwraca pierwszą linię) i zapewnia, że wynikowe podsumowanie ma maksymalnie 500 znaków (obcinając, jeśli to konieczne).
9.  Funkcja serwisowa zwraca wygenerowane (mockowe) podsumowanie jako string.
10. Handler API odbiera podsumowanie od serwisu.
11. Mapuje podsumowanie na format odpowiedzi API (`GenerateSummaryResponseDto`).
12. Zwraca `200 OK` wraz z obiektem odpowiedzi w ciele.
13. W przypadku błędu podczas parsowania JSON, walidacji, weryfikacji autentykacji lub podczas wywołania/przetwarzania odpowiedzi serwisu (LLM mock/API), handler przechwytuje wyjątek/błąd, loguje szczegóły po stronie serwera i zwraca odpowiedni status błędu (`400`, `401`, `500`) z generycznym komunikatem.

## 6. Względy bezpieczeństwa
-   **Uwierzytelnienie:** Endpoint wymaga, aby żądanie pochodziło od uwierzytelnionego użytkownika. Implementacja musi użyć `supabase.auth.getUser()` w handlerze i zwrócić `401 Unauthorized` jeśli użytkownik nie jest zalogowany. Reguła dotycząca `DEFAULT_USER_ID` nie ma tu zastosowania, ponieważ endpoint nie wchodzi w interakcję z danymi użytkownika w bazie danych.
-   **Walidacja Danych:** Walidacja danych wejściowych przy użyciu Zod jest kluczowa, aby zapobiec przetwarzaniu niepoprawnych lub złośliwych danych.
-   **Rate Limiting:** Chociaż w tej chwili używany jest mock LLM, w przyszłości po integracji z prawdziwym API LLM, **krytyczne jest wdrożenie rate limiting** na poziomie serwera/API Gateway dla tego endpointa, aby chronić przed nadużyciem i wysokimi kosztami. Należy o tym pamiętać przy planowaniu infrastruktury produkcyjnej.

## 7. Obsługa błędów
-   **Nieprawidłowe Dane Wejściowe (400):** Parsowanie JSON i walidacja Zod powinny wychwycić błędy formatu i treści żądania (`transcription` brakujące, puste, zły typ). Odpowiedź `400 Bad Request` z informacją o błędach walidacji.
-   **Brak Uwierzytelnienia (401):** Sprawdzenie `supabase.auth.getUser()` obsłuży scenariusz nieautoryzowanego dostępu.
-   **Błędy Serwera / LLM (500):** Wszelkie błędy powstałe podczas wywoływania logiki serwisowej (mocka LLM) powinny być przechwycone. Należy logować szczegóły tych błędów po stronie serwera i zwracać `500 Internal Server Error` z ogólnym komunikatem dla klienta ("An internal server error occurred").

## 8. Etapy wdrożenia
1.  Utworzenie pliku route handler dla endpointa (np. `src/pages/api/generate-summary.ts`).
2.  Zdefiniowanie lub weryfikacja typów `GenerateSummaryCommand` i `GenerateSummaryResponseDto` w centralnym pliku typów (np. `../../types`).
3.  Implementacja walidacji danych wejściowych w handlerze API przy użyciu Zod (`createGenerateSummaryRequestSchema`). Zwrócenie `400 Bad Request` w przypadku błędu walidacji.
4.  Pobranie klienta Supabase z `context.locals.supabase` i sprawdzenie jego dostępności (zwrot 500 Internal Server Error jeśli brak).
5.  Weryfikacja uwierzytelnienia użytkownika przy użyciu `supabase.auth.getUser()` w handlerze. Zwrócenie `401 Unauthorized` jeśli użytkownik nie jest zalogowany.
6.  Utworzenie/aktualizacja `SummaryService` lub dedykowanej klasy/funkcji dla logiki LLM. Dodanie metody (np. `generateSummary`) przyjmującej transkrypcję.
7.  Implementacja **mockowej logiki LLM** w metodzie `generateSummary` serwisu:
    *   Funkcja powinna przyjąć `transcription` (string).
    *   Powinna wyodrębnić pierwszą linię transkrypcji.
    *   Powinna obciąć wynik do maksymalnie 500 znaków, aby spełnić specyfikację API.
    *   Powinna zwrócić obcięty string.
8.  Wywołanie metody serwisowej `generateSummary` z handlera API, przekazując zwalidowaną transkrypcję.
9.  Obsługa odpowiedzi z serwisu: zmapowanie zwróconego podsumowania na `GenerateSummaryResponseDto` i zwrócenie `200 OK`.
10. Implementacja bloku `try...catch` w handlerze API i metodzie serwisowej do przechwytywania błędów (walidacji, autentykacji, nieoczekiwanych). Logowanie szczegółów błędów po stronie serwera. Zwracanie odpowiednich statusów (`400`, `401`, `500`) z generycznymi komunikatami.
11. Przetestowanie endpointa przy użyciu narzędzi takich jak Postman lub cURL, weryfikując wszystkie scenariusze (sukces, błędy walidacji, brak autoryzacji, błędy serwera/mocka).
12. Utworzenie i przegląd kodu (Code Review).
13. Wdrożenie na środowisko testowe/produkcyjne.
