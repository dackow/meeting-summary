# Plan wdrożenia punktu końcowego API: GET /api/summaries

## 1. Przegląd punktu końcowego

Punkt końcowy `GET /api/summaries` służy do pobierania listy podsumowań spotkań należących do uwierzytelnionego użytkownika. Umożliwia filtrowanie wyników według daty utworzenia (domyślnie ostatnie 7 dni) oraz sortowanie według daty utworzenia lub modyfikacji, w kolejności rosnącej lub malejącej. Endpoint zwraca jedynie metadane podsumowań (ID, nazwę pliku, datę utworzenia i modyfikacji), bez pełnej treści transkrypcji, podsumowania czy notatek, zgodnie z wymaganiami widoku listy.

## 2. Szczegóły żądania

- Metoda HTTP: `GET`
- Struktura URL: `/api/summaries`
- Parametry zapytania (Query Parameters):
    - Wymagane: Brak
    - Opcjonalne:
        - `sort_by`: string (domyślnie: `created_at`). Dopuszczalne wartości: `created_at`, `updated_at`.
        - `sort_order`: string (domyślnie: `desc`). Dopuszczalne wartości: `asc`, `desc`.
        - `from_dt`: string (opcjonalnie). Data/czas (ISO 8601) - filtruj od/po tej dacie utworzenia.
        - `to_dt`: string (opcjonalnie). Data/czas (ISO 8601) - filtruj przed/do tej daty utworzenia.
    - Logika filtrowania dat:
        - Jeśli `from_dt` i `to_dt` są pominięte, filtr to `created_at >= NOW() - INTERVAL '7 days' AND created_at <= NOW()`.
        - Jeśli tylko `from_dt` jest podane, filtr to `created_at >= from_dt`.
        - Jeśli tylko `to_dt` jest podane, filtr to `created_at <= to_dt`.
        - Jeśli oba są podane, filtr to `created_at >= from_dt AND created_at <= to_dt`.
- Request Body: Brak

## 3. Wykorzystywane typy

Do implementacji tego punktu końcowego niezbędne będą następujące typy z pliku `type_definitions.ts`:

-   `ListSummariesCommand`: Reprezentuje strukturę parametrów zapytania (query parameters) przychodzących w żądaniu. Służy do typowania i walidacji danych wejściowych.
-   `MeetingSummaryListEntryDto`: Reprezentuje strukturę pojedynczego obiektu podsumowania zwracanego na liście. Odwzorowuje wybrane pola z wiersza bazy danych (`id`, `file_name`, `created_at`, `modified_at`), zmieniając nazwę `modified_at` na `updated_at` w API response.
-   `MeetingSummaryListDto`: Reprezentuje strukturę całej odpowiedzi - tablicę obiektów `MeetingSummaryListEntryDto`.

Wewnętrznie, podczas interakcji z bazą danych, będziemy wykorzystywać typ `Tables<"meeting_summaries">` (lub jego częściowe wersje) reprezentujący strukturę wiersza tabeli `meeting_summaries`.

## 4. Szczegóły odpowiedzi

- Sukces:
    - `200 OK`: Żądanie zostało pomyślnie przetworzone, zwracana jest lista podsumowań.
        - Body: Tablica obiektów typu `MeetingSummaryListEntryDto`.
        ```json
        [
          {
            "id": "uuid",
            "file_name": "string | null",
            "created_at": "timestamp with time zone",
            "updated_at": "timestamp with time zone"
          },
          // ... more summary objects
        ]
        ```
- Błędy:
    - `400 Bad Request`: Nieprawidłowe parametry zapytania (np. niepoprawny format daty, niedozwolona wartość `sort_by`/`sort_order`). Body powinno zawierać opis błędu.
    - `401 Unauthorized`: Uwierzytelnienie jest wymagane lub token jest nieprawidłowy/nieobecny. Zwracany przez Supabase Auth lub middleware backendu.
    - `500 Internal Server Error`: Wystąpił nieoczekiwany błąd po stronie serwera podczas przetwarzania żądania (np. błąd bazy danych, błąd w logice aplikacji). Body *nie* powinno zawierać szczegółów błędu serwera.

## 5. Przepływ danych

1.  Klient wysyła żądanie `GET /api/summaries` z opcjonalnymi parametrami zapytania.
2.  Żądanie trafia do backendu aplikacji zbudowanego w oparciu o Astro/React.
3.  Middleware lub handler autentykacji (wykorzystujący Supabase Auth) weryfikuje, czy użytkownik jest uwierzytelniony. Jeśli nie, zwraca `401 Unauthorized`. Jeśli tak, kontekst użytkownika (np. `user_id`) jest dostępny.
4.  Handler punktu końcowego parsersuje parametry zapytania z żądania HTTP i próbuje je przypisać do obiektu zgodnego z `ListSummariesCommand`.
5.  Przeprowadzana jest walidacja parametrów zapytania:
    *   Sprawdzenie, czy `sort_by` i `sort_order` mają dozwolone wartości.
    *   Walidacja formatu `from_dt` i `to_dt` jako poprawnych ciągów znaków reprezentujących datę/czas (np. ISO 8601). Jeśli format jest nieprawidłowy, zwracany jest błąd `400 Bad Request`.
6.  Na podstawie obecności `from_dt` i `to_dt`, wyznaczany jest zakres dat do filtrowania. Jeśli oba są puste, zakres domyślnie obejmuje ostatnie 7 dni od aktualnego czasu serwera.
7.  Handler wywołuje metodę w warstwie serwisowej/biznesowej (np. `SummaryService.listUserSummaries`), przekazując ID uwierzytelnionego użytkownika, wyznaczony zakres dat oraz parametry sortowania.
8.  `SummaryService` używa klienta Supabase (lub warstwy abstrakcji bazy danych) do zbudowania zapytania SQL do tabeli `meeting_summaries`.
9.  Zapytanie SELECT wybiera kolumny `id`, `file_name`, `created_at`, `modified_at`.
10. Zapytanie stosuje filtry:
    *   Domyślny filtr `user_id = auth.uid()` jest automatycznie narzucany przez Row Level Security (RLS) w bazie danych Supabase, dzięki czemu zapytanie pobiera tylko dane należące do uwierzytelnionego użytkownika. Kod aplikacji *nie* powinien ręcznie dodawać warunku `WHERE user_id = ...` jeśli RLS jest poprawnie skonfigurowane i włączone.
    *   Dodane są warunki filtrowania daty na kolumnie `created_at` (`>= from_date`, `<= to_date`) zgodnie z logiką z kroku 6.
11. Zapytanie stosuje klauzulę `ORDER BY` na kolumnie wskazanej przez `sort_by` (`created_at` lub `modified_at` w DB) z kierunkiem wskazanym przez `sort_order`.
12. Zapytanie jest wykonywane na bazie danych PostgreSQL (Supabase).
13. Klient Supabase zwraca wyniki do `SummaryService`. Wszelkie błędy bazy danych są łapane i traktowane jako błędy wewnętrzne serwera.
14. `SummaryService` mapuje otrzymane wiersze bazy danych na listę obiektów `MeetingSummaryListEntryDto`, w szczególności zmieniając nazwę pola `modified_at` na `updated_at`.
15. Zmapowana lista jest zwracana do handlera punktu końcowego.
16. Handler punktu końcowego zwraca zmapowaną listę jako odpowiedź JSON z kodem statusu `200 OK`. W przypadku błędu na poziomie serwisu (np. błąd DB), handler zwraca `500 Internal Server Error` po zalogowaniu błędu.

## 5. Względy bezpieczeństwa

-   **Uwierzytelnienie:** Obowiązkowe sprawdzenie, czy użytkownik jest uwierzytelniony. Odpowiedzialność Supabase Auth i/lub middleware backendu. Nieautoryzowane żądania muszą być odrzucane z kodem `401 Unauthorized`.
-   **Autoryzacja (RLS):** Kluczowe jest poleganie na skonfigurowanych zasadach Row Level Security (RLS) w bazie danych PostgreSQL (Supabase). Zasada `select_meeting_summaries ON meeting_summaries FOR SELECT USING (user_id = auth.uid());` musi być włączona i poprawnie działająca. Gwarantuje to, że nawet jeśli w kodzie aplikacji pojawi się błąd lub luka, użytkownik *fizycznie* nie będzie w stanie pobrać danych należących do innych użytkowników bezpośrednio z bazy danych poprzez ten endpoint.
-   **Walidacja danych wejściowych:** Wszystkie parametry zapytania (`sort_by`, `sort_order`, `from_dt`, `to_dt`) muszą być dokładnie walidowane pod kątem typu, formatu i dozwolonych wartości, aby zapobiec błędom aplikacji i potencjalnym wektorom ataku (np. prób SQL Injection poprzez manipulację sortowaniem, choć Supabase client powinien to łagodzić przez parametryzację zapytań). Nieprawidłowe dane wejściowe powinny skutkować odpowiedzią `400 Bad Request`.
-   **SQL Injection:** Użycie klienta Supabase (lub innej biblioteki ORM/DB, która poprawnie parametryzuje zapytania) jest niezbędne, aby zapobiec atakom SQL Injection. Parametry filtrowania i sortowania powinny być przekazywane jako parametry zapytania, a nie konkatenowane do ciągu zapytania SQL.

## 6. Obsługa błędów

-   **Nieprawidłowe parametry zapytania:** Jeśli parsowanie lub walidacja parametrów zapytania (`sort_by`, `sort_order`, `from_dt`, `to_dt`) zakończy się niepowodzeniem (np. niepoprawny format daty, niedozwolona wartość sortowania), zwróć `400 Bad Request` z komunikatem informującym, który parametr jest nieprawidłowy i dlaczego.
-   **Błędy uwierzytelnienia:** Żądania bez poprawnego tokenu autoryzacyjnego powinny być odrzucane przez warstwę autentykacji (Supabase Auth) z kodem `401 Unauthorized`.
-   **Błędy wewnętrzne serwera:** Wszelkie nieoczekiwane błędy podczas przetwarzania żądania, takie jak błędy połączenia z bazą danych, błędy podczas wykonywania zapytania SQL (nie związane z RLS odrzuceniem), błędy w logice aplikacji, powinny być:
    *   Złapane (np. w bloku `try...catch`).
    *   Szczegółowo zalogowane po stronie serwera (np. do logów aplikacji, systemu monitorowania błędów; chociaż w dostarczonym schemacie nie ma "tabeli błędów", standardowe logowanie serwerowe jest kluczowe).
    *   Zwrócone do klienta jako `500 Internal Server Error` bez ujawniania wewnętrznych szczegółów błędu.

## 7. Wydajność

-   **Indeksy Bazy Danych:** Dostarczony schemat bazy danych zawiera niezbędne indeksy na `user_id` (`idx_meeting_summaries_user_id`) oraz `created_at` (`idx_meeting_summaries_data_utworzenia`, uwaga na różnicę w nazewnictwie w schemacie vs types/API spec, ale kolumna jest ta sama). Te indeksy są kluczowe dla wydajnego filtrowania po użytkowniku i dacie utworzenia oraz sortowania. W przypadku sortowania po `modified_at`, również powinien istnieć indeks na tej kolumnie, aby zapewnić optymalną wydajność. (Schemat nie wymienia indeksu na `modified_at`, co może być potencjalnym wąskim gardłem przy sortowaniu według daty modyfikacji). *[Należy dodać indeks na `meeting_summaries(modified_at)` dla optymalizacji sortowania przez `updated_at`/`modified_at`]*
-   **RLS:** Włączenie RLS może wprowadzać niewielki narzut na wydajność, ale jest to akceptowalna cena za zapewnienie bezpieczeństwa danych na poziomie bazy.
-   **Zakres Danych:** Endpoint zwraca tylko niezbędne metadane, co minimalizuje ilość danych przesyłanych przez sieć i przetwarzanych w bazie danych. To jest zgodne z zasadą minimalizacji danych w widoku listy.
-   **Brak paginacji:** Obecna specyfikacja nie przewiduje paginacji. Dla użytkowników z bardzo dużą liczbą podsumowań (tysiące), zwracanie całej listy naraz może stać się problemem wydajnościowym i pamięciowym na serwerze i w przeglądarce klienta. W przyszłości należy rozważyć dodanie parametrów paginacji (np. `limit`, `offset` lub cursor-based pagination).

## 8. Etapy wdrożenia

1.  **Definicja trasy:** Utwórz plik/moduł dla handlera API `GET /api/summaries` w strukturze projektu (np. w katalogu `pages/api` w Astro/Next.js, jeśli używana jest architektura serverless functions, lub w odpowiednim miejscu frameworka backendowego).
2.  **Implementacja walidacji:** Dodaj logikę parsowania i walidacji parametrów zapytania (queryString) w handlerze, używając typu `ListSummariesCommand`. Zastosuj walidację formatu daty i dozwolonych wartości dla `sort_by`/`sort_order`. Zwróć `400 Bad Request` w przypadku błędu walidacji.
3.  **Implementacja logiki daty domyślnej:** W handlerze, na podstawie obecności `from_dt` i `to_dt`, zaimplementuj logikę wyznaczania końcowego zakresu dat filtrowania, w tym domyślnych ostatnich 7 dni, jeśli oba parametry są pominięte. Konwertuj stringi dat na odpowiednie typy danych (np. `Date` objects).
4.  **Utworzenie/aktualizacja `SummaryService`:** Jeśli nie istnieje, utwórz klasę lub moduł `SummaryService`. Dodaj publiczną metodę (np. `listUserSummaries`) przyjmującą ID użytkownika, wyznaczony zakres dat filtrowania i parametry sortowania.
5.  **Interakcja z bazą danych (Supabase Client):** Wewnątrz `SummaryService.listUserSummaries`:
    *   Użyj Supabase client, upewniając się, że jest zainicjowany w kontekście uwierzytelnionego użytkownika, tak aby RLS działało poprawnie.
    *   Skonstruuj zapytanie SELECT na tabeli `meeting_summaries`, wybierając kolumny `id`, `file_name`, `created_at`, `modified_at`.
    *   Dodaj klauzule `WHERE` dla filtrowania daty utworzenia (`created_at >= from_date` i/lub `created_at <= to_date`).
    *   Dodaj klauzulę `ORDER BY` na odpowiedniej kolumnie (`created_at` lub `modified_at`) i kierunku (`asc` lub `desc`). Pamiętaj, że `updated_at` w API odpowiada `modified_at` w DB.
    *   Wykonaj zapytanie.
6.  **Mapowanie wyników:** W `SummaryService` (lub w handlerze po otrzymaniu wyników), zmapuj wiersze bazy danych na strukturę `MeetingSummaryListEntryDto`, zmieniając nazwę pola `modified_at` na `updated_at`.
7.  **Obsługa błędów serwisu/DB:** W `SummaryService` i handlerze, zaimplementuj bloki `try...catch` do łapania potencjalnych błędów podczas interakcji z bazą danych. Zalecane jest logowanie tych błędów po stronie serwera.
8.  **Zwracanie odpowiedzi:** W handlerze, jeśli zapytanie zakończyło się sukcesem, zwróć zmapowaną listę jako odpowiedź JSON z kodem statusu `200 OK`. Jeśli wystąpił błąd złapany w `try...catch`, zwróć `500 Internal Server Error`.
9.  **Implementacja autentykacji:** Upewnij się, że warstwa autentykacji (middleware/guard) jest poprawnie skonfigurowana dla tej trasy i odrzuca nieautoryzowane żądania z kodem `401`.
10. **Testowanie:** Napisz testy jednostkowe dla logiki walidacji parametrów i logiki daty domyślnej. Napisz testy integracyjne dla handlera API i `SummaryService`, symulujące różne scenariusze (sukces z różnymi parametrami, brak parametrów, niepoprawne parametry, błąd DB, brak autentykacji).
11. **Wdrożenie RLS:** Upewnij się, że zasada RLS `select_meeting_summaries` na tabeli `meeting_summaries` jest włączona w konfiguracji Supabase.
12. **Dodanie indeksu (jeśli nie istnieje):** Wdrożenie indeksu na `meeting_summaries(modified_at)` w bazie danych dla lepszej wydajności sortowania po tej kolumnie.
13. **Refaktoryzacja i przegląd kodu:** Przejrzyj zaimplementowany kod, upewnij się, że jest zgodny ze standardami projektu, czysty i łatwy do zrozumienia.
14. **Wdrożenie i monitorowanie:** Wdróż zmiany na środowisku testowym/produkcyjnym i monitoruj logi pod kątem błędów.