# Testy Curl dla endpointa POST /api/summaries (One-liner)

Ten dokument zawiera zestaw komend `curl` do przetestowania endpointa API służącego do tworzenia nowych podsumowań spotkań w bazie danych. Endpoint przypisuje rekordy do `DEFAULT_USER_ID` i **nie wymaga** autentykacji w tej wersji MVP. Każda komenda jest w jednej linii.

## Warunki wstępne do uruchomienia testów:

*   **Serwer deweloperski Astro jest uruchomiony:** Uruchom serwer aplikacji komendą `npm run dev` (lub `yarn dev`). Domyślny port serwera Astro to `3003`. Komendy `curl` będą kierowane na ten adres (`http://localhost:3003`).
*   **Migracje zostały zastosowane:** Upewnij się, że migracje dodające kolumnę `title` i usuwające `NOT NULL` z `notes` zostały pomyślnie zastosowane na lokalnej bazie (`supabase migrate dev`).
*   **Domyślny użytkownik istnieje:** Upewnij się, że użytkownik z ID zdefiniowanym w `src/db/supabase.client.ts` (`DEFAULT_USER_ID`) istnieje w tabelach `auth.users` i `public.users`. Endpoint w trybie MVP używa tego stałego ID.
*   **Posiadasz zainstalowane `jq` (opcjonalnie, ale zalecane):** `jq` służy do formatowania wyjścia JSON. Jeśli go nie masz, usuń `| jq .` z końca komend.

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
*   **Error Responses:** `400 Bad Request`, `500 Internal Server Error`. (Status `401 Unauthorized` nie powinien być zwracany w tej wersji implementacji).

## Testy Curl (One-liners):

Używamy `curl -s` do wyciszenia paska postępu i `| jq .` do formatowania odpowiedzi JSON.

---

### Test 1: Pomyślne utworzenie podsumowania - Wszystkie wymagane pola + opcjonalne (`file_name`, `notes`) (201 Created)

**Opis:** Wysyła poprawne ciało żądania POST z kompletnymi danymi, w tym polami opcjonalnymi.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"file_name":"Spotkanie Projektowe Q3.txt","transcription":"Pełna transkrypcja ze spotkania zespołu z polskimi znakami: ąęłóźżćńś.","summary":"Omówiono postępy w projekcie Q3. Zidentyfikowano kluczowe zadania na następny tydzień. Podjęto decyzję o wdrożeniu nowego modułu do końca miesiąca.","llm_generated":true,"notes":"Ważne punkty do zapamiętania: decyzja o module, zadania dla zespołu."}' | jq .
```

**Oczekiwany wynik:** Status `201 Created` i JSON z danymi utworzonego rekordu.

---

### Test 2: Pomyślne utworzenie podsumowania - Tylko wymagane pola (201 Created)

**Opis:** Wysyła poprawnych danych zawierających tylko minimalny zestaw wymaganych pól. Pola opcjonalne (`file_name`, `notes`) są pominięte.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"transcription":"Krótka transkrypcja testowa z polskimi znakami.","summary":"Krótkie podsumowanie testowe.","llm_generated":false}' | jq .
```

**Oczekiwany wynik:** Status `201 Created` i JSON z danymi utworzonego rekordu (file_name i notes będą null/pusty).

---

### Test 3: Brakuje wymaganego pola (`transcription`) (400 Bad Request)

**Opis:** Sprawdzenie walidacji Zod dla brakującego wymaganego pola.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"summary":"Podsumowanie bez transkrypcji.","llm_generated":true}' | jq .
```

**Oczekiwany wynik:** Status `400 Bad Request` i JSON z błędem walidacji Zod.

---

### Test 4: Brakuje wymaganego pola (`summary`) (400 Bad Request)

**Opis:** Sprawdzenie walidacji Zod dla brakującego wymaganego pola.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"transcription":"Transkrypcja bez podsumowania.","llm_generated":false}' | jq .
```

**Oczekiwany wynik:** Status `400 Bad Request` i JSON z błędem walidacji Zod.

---

### Test 5: Brakuje wymaganego pola (`llm_generated`) (400 Bad Request)

**Opis:** Sprawdzenie walidacji Zod dla brakującego wymaganego pola.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"transcription":"Transkrypcja.","summary":"Podsumowanie."}' | jq .
```

**Oczekiwany wynik:** Status `400 Bad Request` i JSON z błędem walidacji Zod.

---

### Test 6: Nieprawidłowy typ danych (`llm_generated` nie jest booleanem) (400 Bad Request)

**Opis:** Sprawdzenie walidacji Zod dla nieprawidłowego typu danych.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"transcription":"Transkrypcja.","summary":"Podsumowanie.","llm_generated":"prawda"}' | jq .
```

**Oczekiwany wynik:** Status `400 Bad Request` i JSON z błędem walidacji Zod.

---

### Test 7: Pole `summary` przekracza 500 znaków (400 Bad Request)

**Opis:** Sprawdzenie walidacji Zod dla maksymalnej długości pola `summary`.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"transcription":"Transkrypcja.","summary":"'"$(python -c 'print('A'*501)')"'","llm_generated":true}' | jq .
```
*(Uwaga: polecenie `$(python -c 'print('A'*501)')` wymaga zainstalowanego Pythona. Jeśli nie masz Pythona, musisz ręcznie utworzyć JSON z podsumowaniem dłuższym niż 500 znaków).*

**Oczekiwany wynik:** Status `400 Bad Request` i JSON z błędem walidacji Zod.

---

### Test 8: Ciało żądania nie jest poprawnym JSONem (400 Bad Request)

**Opis:** Sprawdzenie obsługi błędu parsowania JSON przed walidacją Zod.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"transcription": "...", "summary": "...", "llm_generated": true' | jq .
```

**Oczekiwany wynik:** Status `400 Bad Request` i JSON z ogólnym błędem parsowania JSON.

---

### Test 9: Opcjonalne pole `file_name` ma nieprawidłowy typ (liczba) (400 Bad Request)

**Opis:** Sprawdzenie walidacji Zod dla nieprawidłowego typu danych w polu opcjonalnym.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"transcription":"...","summary":"Krótkie podsumowanie.","llm_generated":true,"file_name":123}' | jq .
```

**Oczekiwany wynik:** Status `400 Bad Request` i JSON z błędem walidacji Zod.

---

### Test 10: Pole `notes` ma nieprawidłowy typ (liczba) (400 Bad Request)

**Opis:** Sprawdzenie walidacji Zod dla nieprawidłowego typu danych w polu opcjonalnym.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"transcription":"...","summary":"Krótkie podsumowanie.","llm_generated":true,"notes":456}' | jq .
```

**Oczekiwany wynik:** Status `400 Bad Request` i JSON z błędem walidacji Zod.

---

### Test 11: Błąd wewnętrzny serwera (np. konflikt RLS / błąd DB) (500 Internal Server Error)

**Opis:** Testuje, jak handler API reaguje na błędy zgłoszone przez warstwę bazy danych (np. Supabase/PostgreSQL). W trybie MVP, gdzie używamy `DEFAULT_USER_ID` zamiast `auth.uid()`, jeśli RLS jest aktywne i skonfigurowane do sprawdzania `user_id = auth.uid()`, próba wstawienia rekordu z jawnie podanym `DEFAULT_USER_ID` spowoduje błąd RLS na poziomie bazy danych, który powinien zostać przechwycony i zwrócony jako 500.

**Komenda:** Użyj poprawnego ciała żądania, które przeszło walidację (np. z Testu 1 lub Testu 2). Błąd 500 wystąpi, jeśli baza danych odrzuci zapytanie INSERT.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/summaries -H "Content-Type: application/json" -d '{"transcription":"Test transkrypcji dla błędu DB.","summary":"Testowe podsumowanie dla błędu DB.","llm_generated":true}' | jq .
```

**Oczekiwany wynik:** Status `500 Internal Server Error` i JSON z ogólnym błędem serwera.

---
