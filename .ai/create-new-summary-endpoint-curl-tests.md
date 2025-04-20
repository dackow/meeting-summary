# Testy Curl dla endpointa POST /api/summaries

Ten dokument zawiera zestaw komend `curl` do przetestowania endpointa API służącego do tworzenia nowych podsumowaĹ„ spotkaĹ„.

## Warunki wstępne do uruchomienia testów:

*   **Lokalne Supabase jest uruchomione:** Upewnij się, że Twoje lokalne usługi Supabase działają (np. po uruchomieniu `supabase start` lub `supabase develop`). Domyślny port dla API to `54321`, a dla bazy danych `54322`.
*   **Serwer deweloperski Astro jest uruchomiony:** Uruchom serwer aplikacji komendą `npm run dev` (lub `yarn dev`). Domyślny port to `3003` (zgodnie z `astro.config.mjs`). Komendy `curl` będą kierowane na ten adres (`http://localhost:3003`).
*   **Migracje zostały zastosowane:** Upewnij się, że wszystkie potrzebne migracje, w tym dodające kolumnę `title` i usuwające `NOT NULL` z `notes`, zostały pomyślnie zastosowane na lokalnej bazie (`supabase migrate dev`).
*   **Domyślny użytkownik istnieje:** Upewnij się, że użytkownik z ID zdefiniowanym w `src/db/supabase.client.ts` (`DEFAULT_USER_ID`) istnieje w tabelach `auth.users` i `public.users`. Endpoint w trybie MVP omija standardową autentykację i używa tego stałego ID.
*   **Posiadasz zainstalowane `jq` (opcjonalnie, ale zalecane):** `jq` służy do formatowania wyjścia JSON. Jeśli go nie masz, usuĹ„ `| jq .` z koĹ„ca komend.

## Opis endpointa:

*   **Metoda HTTP:** `POST`
*   **URL Path:** `/api/summaries`
*   **Request Body (JSON):**
    ```json
    {
      "file_name": "string | null", // Optional
      "transcription": "string",     // Required
      "summary": "string",           // Required, max 500 characters
      "llm_generated": "boolean",    // Required
      "notes": "string"              // Optional
    }
    ```
*   **Success Response (201 Created):** JSON object of the created summary.
*   **Error Responses:** `400 Bad Request`, `401 Unauthorized` (choć pomijamy autentykację w MVP, teoretycznie), `500 Internal Server Error`.

## Testy Curl:

Używamy `curl -s` do wyciszenia paska postępu i `| jq .` do formatowania odpowiedzi JSON. Nagłówki HTTP nie będą widoczne w standardowym wyjściu.

---

### Test 1: Pomyślne utworzenie podsumowania - Wszystkie wymagane pola + opcjonalne (`file_name`, `notes`) (201 Created)

**Opis:** Wysłanie poprawnego ciała żądania POST z kompletnymi danymi, w tym polami opcjonalnymi.

**Komenda:**

```bash
curl -s -X POST \
  http://localhost:3003/api/summaries \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "Spotkanie Projektowe Q3.txt",
    "transcription": "Pełna transkrypcja ze spotkania zespołu...",
    "summary": "Omówiono postępy w projekcie Q3. Zidentyfikowano kluczowe zadania na następny tydzieĹ„. Podjęto decyzję o wdrożeniu nowego modułu do koĹ„ca miesiąca.",
    "llm_generated": true,
    "notes": "Ważne punkty do zapamiętania: decyzja o module, zadania dla zespołu."
  }' | jq .
```

```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"file_name":"Spotkanie Projektowe Q3.txt","transcription":"Pełna transkrypcja ze spotkania zespołu...","summary":"Omówiono postępy w projekcie Q3. Zidentyfikowano kluczowe zadania na następny tydzień. Podjęto decyzję o wdrożeniu nowego modułu do końca miesiąca.","llm_generated":true,"notes":"Ważne punkty do zapamiętania: decyzja o module, zadania dla zespołu."}' | jq .
```

**Oczekiwany wynik:**

*   Status HTTP: `201 Created`
*   Ciało odpowiedzi JSON: Obiekt JSON (`CreateSummaryResponseDTO`) zawierający wszystkie pola z żądania POST plus pola nadane przez bazę danych (`id`, `user_id` - powinno być `DEFAULT_USER_ID`, `created_at`, `updated_at`, `title` - wygenerowany automatycznie).

---

### Test 2: Pomyślne utworzenie podsumowania - Tylko wymagane pola (201 Created)

**Opis:** Wysłanie poprawnych danych zawierających tylko minimalny zestaw wymaganych pól. Pola opcjonalne (`file_name`, `notes`) są pominięte.

**Komenda:**

```bash
curl -s -X POST \
  http://localhost:3003/api/summaries \
  -H "Content-Type: application/json" \
  -d '{
    "transcription": "Krótka transkrypcja testowa.",
    "summary": "Krótkie podsumowanie testowe.",
    "llm_generated": false
  }' | jq .
```

```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"transcription":"Krótka transkrypcja testowa.","summary":"Krótkie podsumowanie testowe.","llm_generated":false}' | jq .

```

**Oczekiwany wynik:**

*   Status HTTP: `201 Created`
*   Ciało odpowiedzi JSON: Obiekt JSON (`CreateSummaryResponseDTO`) zawierający wymagane pola z żądania oraz pola nadane przez bazę danych. Pola `file_name` i `notes` powinny być `null` lub puste stringi (zgodnie z domyślną wartością w Zod schema i mapowaniem do DB Insert). Pole `title` powinno być wygenerowane automatycznie na podstawie daty.

---

### Test 3: Brakuje wymaganego pola (`transcription`) (400 Bad Request)

**Opis:** Sprawdzenie walidacji Zod dla brakującego wymaganego pola.

**Komenda:**

```bash
curl -s -X POST \
  http://localhost:3003/api/summaries \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Podsumowanie bez transkrypcji.",
    "llm_generated": true
  }' | jq .
```

```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"summary":"Podsumowanie bez transkrypcji.","llm_generated":true}' | jq .

```

**Oczekiwany wynik:**

*   Status HTTP: `400 Bad Request`
*   Ciało odpowiedzi JSON: Obiekt JSON z komunikatem błędu walidacji i szczegółami (`details`) wskazującymi na błąd pola `transcription`.

---

### Test 4: Brakuje wymaganego pola (`summary`) (400 Bad Request)

**Opis:** Sprawdzenie walidacji Zod dla brakującego wymaganego pola.

**Komenda:**

```bash
curl -s -X POST \
  http://localhost:3003/api/summaries \
  -H "Content-Type: application/json" \
  -d '{
    "transcription": "Transkrypcja bez podsumowania.",
    "llm_generated": false
  }' | jq .
```

```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"transcription":"Transkrypcja bez podsumowania.","llm_generated":false}' | jq .

```

**Oczekiwany wynik:**

*   Status HTTP: `400 Bad Request`
*   Ciało odpowiedzi JSON: Obiekt JSON z komunikatem błędu walidacji i szczegółami (`details`) wskazującymi na błąd pola `summary`.

---

### Test 5: Brakuje wymaganego pola (`llm_generated`) (400 Bad Request)

**Opis:** Sprawdzenie walidacji Zod dla brakującego wymaganego pola.

**Komenda:**

```bash
curl -s -X POST \
  http://localhost:3003/api/summaries \
  -H "Content-Type: application/json" \
  -d '{
    "transcription": "Transkrypcja.",
    "summary": "Podsumowanie."
  }' | jq .
```

```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"transcription":"Transkrypcja.","summary":"Podsumowanie."}' | jq .

```

**Oczekiwany wynik:**

*   Status HTTP: `400 Bad Request`
*   Ciało odpowiedzi JSON: Obiekt JSON z komunikatem błędu walidacji i szczegółami (`details`) wskazującymi na błąd pola `llm_generated`.

---

### Test 6: Nieprawidłowy typ danych (`llm_generated` nie jest booleanem) (400 Bad Request)

**Opis:** Sprawdzenie walidacji Zod dla nieprawidłowego typu danych.

**Komenda:**

```bash
curl -s -X POST \
  http://localhost:3003/api/summaries \
  -H "Content-Type: application/json" \
  -d '{
    "transcription": "Transkrypcja.",
    "summary": "Podsumowanie.",
    "llm_generated": "prawda"
  }' | jq .
```

```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"transcription":"Transkrypcja.","summary":"Podsumowanie.","llm_generated":prawda}' | jq .

```

**Oczekiwany wynik:**

*   Status HTTP: `400 Bad Request`
*   Ciało odpowiedzi JSON: Obiekt JSON z komunikatem błędu walidacji i szczegółami (`details`) wskazującymi na błąd pola `llm_generated`.

---

### Test 7: Pole `summary` przekracza 500 znaków (400 Bad Request)

**Opis:** Sprawdzenie walidacji Zod dla maksymalnej długości pola `summary`.

**Komenda:**

```bash
# Generowanie ciągu 501 znaków 'A' za pomocą Pythona
curl -s -X POST \
  http://localhost:3003/api/summaries \
  -H "Content-Type: application/json" \
  -d '{
    "transcription": "Transkrypcja.",
    "summary": "'$(python -c 'print("A"*501)')'",
    "llm_generated": true
  }' | jq .
```
*(Uwaga: polecenie `$(python -c 'print("A"*501)')` wymaga zainstalowanego Pythona. Jeśli nie masz Pythona, musisz ręcznie utworzyć JSON z podsumowaniem dłuższym niż 500 znaków).*

**Oczekiwany wynik:**

*   Status HTTP: `400 Bad Request`
*   Ciało odpowiedzi JSON: Obiekt JSON z komunikatem błędu walidacji i szczegółami (`details`) wskazującymi na błąd pola `summary` (związany z `max` length).

---

### Test 8: Ciało żądania nie jest poprawnym JSONem (400 Bad Request)

**Opis:** Sprawdzenie obsługi błędu parsowania JSON przed walidacją Zod.

**Komenda:**

```bash
curl -s -X POST \
  http://localhost:3003/api/summaries \
  -H "Content-Type: application/json" \
  -d '{
    "transcription": "...",
    "summary": "...",
    "llm_generated": true # Brak zamykającego nawiasu klamrowego }
  ' | jq .
```

**Oczekiwany wynik:**

*   Status HTTP: `400 Bad Request`
*   Ciało odpowiedzi JSON: Obiekt JSON z ogólnym komunikatem błędu wskazującym na problem z formatem JSON (`"Invalid JSON body"`).

---

### Test 9: Opcjonalne pole `file_name` ma nieprawidłowy typ (liczba) (400 Bad Request)

**Opis:** Sprawdzenie walidacji Zod dla nieprawidłowego typu danych w polu opcjonalnym.

**Komenda:**

```bash
curl -s -X POST \
  http://localhost:3003/api/summaries \
  -H "Content-Type: application/json" \
  -d '{
    "transcription": "...",
    "summary": "Krótkie podsumowanie.",
    "llm_generated": true,
    "file_name": 123
  }' | jq .
```

**Oczekiwany wynik:**

*   Status HTTP: `400 Bad Request`
*   Ciało odpowiedzi JSON: Obiekt JSON z komunikatem błędu walidacji i szczegółami (`details`) wskazującymi na błąd pola `file_name` (związany z typem).

---

### Test 10: Pole `notes` ma nieprawidłowy typ (liczba) (400 Bad Request)

**Opis:** Sprawdzenie walidacji Zod dla nieprawidłowego typu danych w polu opcjonalnym.

**Komenda:**

```bash
curl -s -X POST \
  http://localhost:3003/api/summaries \
  -H "Content-Type: application/json" \
  -d '{
    "transcription": "...",
    "summary": "Krótkie podsumowanie.",
    "llm_generated": true,
    "notes": 456
  }' | jq .
```

**Oczekiwany wynik:**

*   Status HTTP: `400 Bad Request`
*   Ciało odpowiedzi JSON: Obiekt JSON z komunikatem błędu walidacji i szczegółami (`details`) wskazującymi na błąd pola `notes` (związany z typem).

---

### Test 11: Błąd wewnętrzny serwera (np. konflikt RLS / błąd DB) (500 Internal Server Error)

**Opis:** Testuje, jak handler API reaguje na błędy zgłoszone przez warstwę bazy danych (np. Supabase/PostgreSQL). W trybie MVP, gdzie używamy `DEFAULT_USER_ID` zamiast `auth.uid()`, jeśli RLS jest aktywne i skonfigurowane do sprawdzania `user_id = auth.uid()`, próba wstawienia rekordu z jawnie podanym `DEFAULT_USER_ID` spowoduje błąd RLS na poziomie bazy danych, który powinien zostać przechwycony i zwrócony jako 500.

**Komenda:** Użyj poprawnego ciała żądania, które przeszło walidację (np. z Testu 1 lub Testu 2). Błąd 500 wystąpi, jeśli baza danych odrzuci zapytanie INSERT.

```bash
# Użyj poprawnego ciała żądania, które przeszło walidację
curl -s -X POST \
  http://localhost:3003/api/summaries \
  -H "Content-Type: application/json" \
  -d '{
    "transcription": "Test transkrypcji dla błędu DB.",
    "summary": "Testowe podsumowanie dla błędu DB.",
    "llm_generated": true
  }' | jq .
```

**Oczekiwany wynik:**

*   Status HTTP: `500 Internal Server Error`
*   Ciało odpowiedzi JSON: Obiekt JSON z ogólnym komunikatem błędu serwera (`"Internal server error occurred while saving the summary."`). Szczegóły błędu DB/RLS *nie powinny* być ujawniane w odpowiedzi.

---
