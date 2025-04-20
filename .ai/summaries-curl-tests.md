## Warunki wstępne do uruchomienia testów:

*   **Lokalne Supabase jest uruchomione:** Upewnij się, że Twoje lokalne usługi Supabase działają (np. po uruchomieniu `supabase start` lub `supabase develop`). Domyślny port dla API to `54321`, a dla bazy danych `54322`.
*   **Serwer deweloperski Astro jest uruchomiony:** Uruchom serwer aplikacji komendą `npm run dev` (lub `yarn dev`). Domyślny port to `3003`. Komendy `curl` będą kierowane na ten adres (`http://localhost:3003`).
*   **Migracje zostały zastosowane:** Upewnij się, że migracje dodające kolumnę `title` i usuwające `NOT NULL` z `notes` zostały pomyślnie zastosowane na lokalnej bazie (`supabase migrate dev`).
*   **Typy TypeScript zaktualizowane:** Upewnij się, że `src/db/database.types.ts` został zaktualizowany po migracji dodającej `title` (`supabase gen types typescript --db-url "..." > src/db/database.types.ts`).
*   **Domyślny użytkownik istnieje:** Upewnij się, że użytkownik z ID zdefiniowanym w `src/db/supabase.client.ts` (`DEFAULT_USER_ID`) istnieje w tabelach `auth.users` i `public.users`. API w trybie MVP omija standardową autentykację i używa tego stałego ID.
*   **Posiadasz testowe dane (opcjonalnie):** Aby przetestować zwracanie listy z danymi, dodaj kilka przykładowych rekordów do tabeli `public.meeting_summaries` dla użytkownika o `DEFAULT_USER_ID`. Upewnij się, że mają wartości dla `title`, `file_name`, `created_at`, `modified_at`. Możesz to zrobić przez Supabase Studio (`http://localhost:54323`) lub komendą SQL. Pamiętaj o ustawieniu `user_id` na `DEFAULT_USER_ID`.
*   **Posiadasz zainstalowane `jq` (opcjonalnie, ale zalecane):** `jq` służy do formatowania wyjścia JSON. Jeśli go nie masz, usuń `| jq .` z końca komend.

## Struktura komend curl:

Będziemy używać `curl -s` (silent mode, bez paska postępu) i przekazywać samo ciało odpowiedzi do `jq .` w celu formatowania. Nagłówki HTTP nie będą wyświetlane domyślnie, co rozwiązuje poprzedni błąd.

Adres bazowy to `http://localhost:3003`.

---

## Test 1: Pobranie domyślnej listy podsumowań (ostatnie 7 dni, sortowanie `created_at` DESC)

**Opis:** Testuje podstawowe działanie endpointu bez żadnych parametrów. Powinien zwrócić podsumowania utworzone w ciągu ostatnich 7 dni, posortowane od najnowszych, zawierające pola `id`, `title`, `file_name`, `created_at`, `updated_at`.

**Komenda:**

```bash
curl -s "http://localhost:3003/api/summaries" | jq .
```

**Oczekiwany wynik:**

*   Status HTTP (sprawdzany wizualnie, `curl -I` lub `curl -v` pokazałby nagłówki, ale celowo je ukrywamy dla `jq`): Powinien być `200`.
*   Ciało odpowiedzi JSON: Tablica obiektów (`[]` jeśli brak rekordów dla użytkownika w ciągu 7 dni, lub lista obiektów `{ id: "...", title: "...", file_name: "...", created_at: "...", updated_at: "..." }` jeśli rekordy istnieją). W przypadku braku rekordów powinieneś zobaczyć `[]`.

---

## Test 2: Pobranie listy z sortowaniem po `updated_at` ASC

**Opis:** Testuje sortowanie po dacie modyfikacji (`updated_at` w API, `modified_at` w DB) w kolejności rosnącej.

**Komenda:**

```bash
curl -s "http://localhost:3003/api/summaries?sort_by=updated_at&sort_order=asc" | jq .
```

**Oczekiwany wynik:**

*   Status HTTP: `200`
*   Ciało odpowiedzi JSON: Tablica obiektów, posortowana według pola `updated_at` od najstarszych do najnowszych.

---

## Test 3: Pobranie listy z filtrowaniem od konkretnej daty

**Opis:** Testuje filtrowanie listy, zwracając tylko rekordy utworzone od (lub po) podanej dacie. Podmień `YYYY-MM-DDTHH:mm:ssZ` na faktyczną datę w formacie ISO 8601, która pasuje do Twoich danych testowych.

**Komenda:**

```bash
# Przykład, zaktualizuj datę na taką, która zadziała z Twoimi danymi:
curl -s "http://localhost:3003/api/summaries?from_dt=2025-04-23T10:00:00Z" | jq .
```

**Oczekiwany wynik:**

*   Status HTTP: `200`
*   Ciało odpowiedzi JSON: Tablica obiektów, zawierająca tylko rekordy, których `created_at` jest większe lub równe podanej wartości `from_dt`.

---

## Test 4: Pobranie listy z filtrowaniem do konkretnej daty

**Opis:** Testuje filtrowanie listy, zwracając tylko rekordy utworzone do (lub przed) podanej daty. Podmień datę.

**Komenda:**

```bash
# Przykład, zaktualizuj datę na taką, która zadziała z Twoimi danymi:
curl -s "http://localhost:3003/api/summaries?to_dt=2025-04-25T10:00:00Z" | jq .
```

**Oczekiwany wynik:**

*   Status HTTP: `200`
*   Ciało odpowiedzi JSON: Tablica obiektów, zawierająca tylko rekordy, których `created_at` jest mniejsze lub równe podanej wartości `to_dt`.

---

## Test 5: Pobranie listy z filtrowaniem w zakresie dat

**Opis:** Testuje filtrowanie listy w określonym zakresie dat utworzenia. Podmień daty na takie, które obejmą lub wykluczą Twoje dane testowe.

**Komenda:**

```bash
# Przykład, zaktualizuj daty:
curl -s "http://localhost:3003/api/summaries?from_dt=2025-04-24T00:00:00Z&to_dt=2025-04-24T23:59:59Z" | jq .
```

**Oczekiwany wynik:**

*   Status HTTP: `200`
*   Ciało odpowiedzi JSON: Tablica obiektów, zawierająca tylko rekordy, których `created_at` mieści się w podanym zakresie.

---

## Test 6: Testowanie pustej listy (bez rekordów pasujących do filtra)

**Opis:** Testuje scenariusz, gdy dla `DEFAULT_USER_ID` nie ma żadnych rekordów pasujących do filtra (np. używając filtra daty, który na pewno nic nie zwróci).

**Komenda:** Użyj filtra z datą spoza zakresu danych, np.

```bash
curl -s "http://localhost:3003/api/summaries?from_dt=1900-01-01T00:00:00Z&to_dt=1900-01-01T23:59:59Z" | jq .
```

**Oczekiwany wynik:**

*   Status HTTP: `200`
*   Ciało odpowiedzi JSON: Pusta tablica JSON: `[]`

---

## Test 7: Testowanie nieprawidłowych parametrów zapytania

**Opis:** Testuje, co się stanie, gdy podane zostaną nieprawidłowe parametry zapytania (np. niepoprawny format daty lub niedozwolona wartość dla `sort_by`). Oczekiwany jest błąd `400 Bad Request`. W tym przypadku `curl -s` nadal zwróci ciało odpowiedzi (JSON z błędem), więc piping do `jq` zadziała.

**Komendy (przykłady):**

```bash
# Nieprawidłowa wartość sort_by
curl -s "http://localhost:3003/api/summaries?sort_by=invalid_column" | jq .

# Nieprawidłowy format daty
curl -s "http://localhost:3003/api/summaries?from_dt=not-a-date" | jq .
```

**Oczekiwany wynik (dla obu komend):**

*   Status HTTP: `400` (możesz to sprawdzić np. przez `curl -I "..."` lub `curl -v "..."` bez piping do jq)
*   Ciało odpowiedzi JSON: Obiekt JSON z komunikatem błędu i szczegółami walidacji z Zod, np.
    ```json
    {
      "message": "Invalid query parameters",
      "errors": {
        // Details about which parameter failed validation
        ...
      }
    }
    ```
