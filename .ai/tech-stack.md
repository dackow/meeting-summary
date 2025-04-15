## Tech Stack - Meeting Summarizer

**Główny cel:** Szybkie tworzenie aplikacji webowej do podsumowywania transkrypcji spotkań w języku polskim.

**Kluczowe technologie:**

*   **Frontend:**
    *   **Astro.js:**  Framework do budowy szybkich stron z minimalnym JavaScript.
    *   **React:**  Biblioteka do budowy interfejsu użytkownika (komponenty).
    *   **Tailwind CSS:**  Utility-first framework CSS do szybkiego stylowania.
    *   **Lucide React:** Biblioteka ikon.
*   **Backend & Baza danych:**
    *   **Supabase:** Backend-as-a-Service (BaaS) - autentykacja, baza danych PostgreSQL.
*   **Inne:**
    *   **LLM API (np. GPT-3.5):**  Generowanie podsumowań (alternatywnie lokalne LLM jak ollama).
    *   **ESLint/Prettier:**  Linting i formatowanie kodu.

**Zalety:**

*   Szybki development (Astro, React, Tailwind).
*   Skalowalność (React, Astro, Supabase).
*   Relatywnie niski koszt początkowy (open-source, darmowy plan Supabase).
*   Autentykacja i baza danych "od ręki" (Supabase).

**Do rozważenia/Optymalizacja:**

*   Koszty LLM API (optymalizacja promptów, rozważenie lokalnego LLM).
*   Bezpieczeństwo (konfiguracja autentykacji Supabase, ochrona przed atakami).
*   Testowanie (brak frameworku testowego).
*   Aktualizacja przestarzałych zależności.
*   Monitorowanie logów i obsługa błędów.
