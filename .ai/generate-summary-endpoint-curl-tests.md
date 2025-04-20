# Testy Curl dla endpointa POST /api/generate-summary (Bez Autentykacji MVP - One-liner)

Ten dokument zawiera zestaw komend `curl` do przetestowania endpointa API służącego do generowania podsumowań za pomocą mocka LLM. Zgodnie z aktualnymi wytycznymi, ten endpoint **nie wymaga** uwierzytelnienia. Każda komenda jest w jednej linii.

## Warunki wstępne do uruchomienia testów:

*   **Serwer deweloperski Astro jest uruchomiony:** Upewnij się, że Twoje lokalne usługi Supabase i serwer Astro działają (np. po uruchomieniu `supabase start` lub `supabase develop`). Domyślny port serwera Astro to `3003`. Komendy `curl` będą kierowane na ten adres (`http://localhost:3003`).
*   **Posiadasz zainstalowane `jq` (opcjonalnie, ale zalecane):** `jq` służy do formatowania wyjścia JSON. Jeśli go nie masz, usuń `| jq .` z końca komend.
*   Supabase Auth może być skonfigurowane w projekcie dla innych endpointów, ale **dla tego endpointa autentykacja jest pomijana.**

## Opis endpointa:

*   **Metoda HTTP:** `POST`
*   **URL Path:** `/api/generate-summary`
*   **Request Body (JSON):**
    ```json
    {
      "transcription": "string" // Required, non-empty
    }
    ```
*   **Success Response (200 OK):** JSON object `{ "summary": "string" }` (max 500 chars).
*   **Error Responses:** `400 Bad Request`, `500 Internal Server Error`. (Status `401 Unauthorized` nie powinien być zwracany w tej wersji implementacji).

## Testy Curl (One-liners):

Używamy `curl -s` do wyciszenia paska postępu i `| jq .` do formatowania odpowiedzi JSON.

---

### Test 1: Pomyślne wygenerowanie podsumowania (200 OK)

**Opis:** Wysyła poprawne żądanie z transkrypcją. Autentykacja nie jest wymagana.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/generate-summary -H "Content-Type: application/json" -d '{"transcription": "To jest pierwsza linia transkrypcji z polskimi znakami: ąęłóźżćńś.\nDruga linia.\nTrzecia linia z jakimiś szczegółami..."}' | jq .
```

**Oczekiwany wynik:** Status `200 OK` i JSON z mockowym podsumowaniem.

---

### Test 2: Brak pola `transcription` (400 Bad Request)

**Opis:** Brakuje wymaganego pola `transcription` w ciele żądania.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/generate-summary -H "Content-Type: application/json" -d '{"otherField": "jakaś wartość"}' | jq .
```

**Oczekiwany wynik:** Status `400 Bad Request` i JSON z błędem walidacji.

---

### Test 3: Pole `transcription` jest pustym stringiem (400 Bad Request)

**Opis:** Pole `transcription` jest obecne, ale jest pustym stringiem.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/generate-summary -H "Content-Type: application/json" -d '{"transcription": ""}' | jq .
```

**Oczekiwany wynik:** Status `400 Bad Request` i JSON z błędem walidacji.

---

### Test 4: Pole `transcription` ma nieprawidłowy typ (np. liczba) (400 Bad Request)

**Opis:** Pole `transcription` jest obecne, ale nie jest typu string.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/generate-summary -H "Content-Type: application/json" -d '{"transcription": 12345}' | jq .
```

**Oczekiwany wynik:** Status `400 Bad Request` i JSON z błędem walidacji.

---

### Test 5: Ciało żądania nie jest poprawnym JSONem (400 Bad Request)

**Opis:** Ciało żądania nie jest poprawnym formatem JSON.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/generate-summary -H "Content-Type: application/json" -d '{"transcription": "..."' | jq .
```

**Oczekiwany wynik:** Status `400 Bad Request` i JSON z ogólnym błędem parsowania JSON.

---

### Test 6: Wysyłanie żądania bez autentykacji (Oczekiwany Sukces 200 OK)

**Opis:** Testuje scenariusz, który wcześniej zwracał 401. Teraz, z powodu braku wymaganej autentykacji, żądanie powinno się udać, jeśli ciało jest poprawne.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/generate-summary -H "Content-Type: application/json" -d '{"transcription": "To jest transkrypcja, która powinna działać bez autentykacji."}' | jq .
```

**Oczekiwany wynik:** Status `200 OK` i JSON z mockowym podsumowaniem.

---

### Test 7: Wysyłanie żądania z nieprawidłowym/pustym nagłówkiem Authorization (Oczekiwany Sukces 200 OK)

**Opis:** Testuje scenariusz, który wcześniej zwracał 401 z powodu nieprawidłowego/pustego nagłówka. Teraz powinno się udać, jeśli ciało jest poprawne.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/generate-summary -H "Content-Type: application/json" -H "Authorization: Bearer invalid.token.string" -d '{"transcription": "Inna transkrypcja, która powinna działać mimo \'fałszywej\' autentykacji."}' | jq .
```

**Oczekiwany wynik:** Status `200 OK` i JSON z mockowym podsumowaniem.

---

### Test 8: Błąd wewnętrzny serwera (np. w mocku LLM) (500 Internal Server Error)

**Opis:** Symulacja błędu w logice mocka LLM (jeśli wstawiono tam celowe rzucanie błędu na potrzeby testów 500). Autentykacja nie wpływa na ten scenariusz.

**Komenda:**
```bash
curl -s -X POST http://localhost:3003/api/generate-summary -H "Content-Type: application/json" -d '{"transcription": "To jest transkrypcja, ktora ma wywolac blad w mocku."}' | jq .
```

**Oczekiwany wynik:** Status `500 Internal Server Error` i JSON z ogólnym błędem serwera.

---
