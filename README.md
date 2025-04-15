```markdown
# Meeting Summarizer

## Opis Projektu

Meeting Summarizer to aplikacja webowa zaprojektowana w celu automatyzacji procesu tworzenia podsumowań z transkrypcji spotkań w języku polskim. Jest skierowana do użytkowników technicznych, takich jak programiści, którzy są odpowiedzialni za dokumentowanie spotkań. Aplikacja umożliwia użytkownikom przesłanie pliku tekstowego zawierającego transkrypcję, edycję transkrypcji, generowanie podsumowania przy użyciu modelu językowego (LLM), dalszą edycję podsumowania oraz zapisanie zarówno oryginalnej transkrypcji, jak i wygenerowanego podsumowania w bazie danych. Użytkownicy mogą również przeglądać i edytować wcześniej zapisane podsumowania. Minimum Viable Product (MVP) koncentruje się na podstawowej funkcjonalności, aby zapewnić szybkie i sprawne generowanie podsumowań spotkań.

## Stack Technologiczny

*   **Frontend:**
    *   [Astro.js](https://astro.build/): Framework do budowy szybkich stron internetowych z minimalnym użyciem JavaScript po stronie klienta.
    *   [React](https://reactjs.org/): Biblioteka JavaScript do budowy interfejsów użytkownika.
    *   [Tailwind CSS](https://tailwindcss.com/): Utility-first framework CSS do szybkiego tworzenia interfejsów.
    *   [Lucide React](https://lucide.dev/): Biblioteka ikon.
*   **Backend & Baza Danych:**
    *   [Supabase](https://supabase.com/): Backend-as-a-Service (BaaS) zapewniający uwierzytelnianie i bazę danych PostgreSQL.
*   **Inne:**
    *   LLM API (np. GPT-3.5 przez API lub lokalna instancja Ollama): Do generowania podsumowań.
    *   [ESLint](https://eslint.org/): Linter JavaScript.
    *   [Prettier](https://prettier.io/): Formater kodu.

## Uruchomienie Lokalnie

Wykonaj następujące kroki, aby uruchomić projekt na swoim lokalnym komputerze:

**Wymagania Wstępne:**

*   [Node.js](https://nodejs.org/en/) (v22.14.0)
*   [npm](https://www.npmjs.com/) lub [Yarn](https://yarnpkg.com/) - menedżer pakietów

**Instalacja:**

1.  Sklonuj repozytorium:

    ```bash
    git clone [URL repozytorium]
    cd meeting-summarizer
    ```

2.  Zainstaluj zależności za pomocą npm lub yarn:

    ```bash
    npm install
    # lub
    yarn install
    ```

**Konfiguracja:**

1.  **Konfiguracja Supabase:**
    *   Utwórz projekt Supabase na stronie [https://supabase.com/](https://supabase.com/).
    *   Uzyskaj adres URL Supabase i klucz `anon`.
    *   Skonfiguruj schemat bazy danych zgodnie z wymaganiami projektu (tabele do przechowywania transkrypcji i podsumowań).
    *   Skonfiguruj zmienne środowiskowe za pomocą adresu URL Supabase i klucza `anon`. Przykładowy plik `.env.example` może wyglądać tak (utwórz plik `.env` i wypełnij te wartości):

        ```
        PUBLIC_SUPABASE_URL="TWÓJ_ADRES_URL_SUPABASE"
        PUBLIC_SUPABASE_ANON_KEY="TWÓJ_KLUCZ_ANON_SUPABASE"
        ```

2.  **Konfiguracja LLM API:**
    *   Uzyskaj klucz API od dostawcy modelu językowego (np. OpenAI dla GPT-3.5) lub skonfiguruj lokalną instancję Ollama.
    *   Skonfiguruj swój klucz API jako zmienną środowiskową:

        ```
        OPENAI_API_KEY="TWÓJ_KLUCZ_API_OPENAI"
        ```

**Uruchomienie Aplikacji:**

```bash
npm run dev
# lub
yarn dev
```

Aplikacja zostanie uruchomiona w trybie deweloperskim i możesz uzyskać do niej dostęp pod adresem `http://localhost:3000` (lub port określony w konfiguracji Astro).

## Dostępne Skrypty

Dostępne są następujące skrypty:

*   `dev`: Uruchamia serwer deweloperski.
*   `build`: Buduje aplikację gotową do produkcji.
*   `preview`: Podgląd zbudowanej aplikacji.
*   `lint`: Uruchamia ESLint do sprawdzania kodu.
*   `lint:fix`: Uruchamia ESLint i automatycznie naprawia problemy.
*   `format`: Uruchamia Prettier do formatowania kodu.

## Zakres Projektu

Ten projekt koncentruje się na następujących podstawowych funkcjonalnościach MVP:

*   Przesyłanie plików tekstowych z transkrypcjami (.txt, do 1MB).
*   Edycja transkrypcji.
*   Generowanie podsumowań za pomocą LLM (ograniczone do ~500 znaków).
*   Edycja wygenerowanych podsumowań.
*   Zapisywanie transkrypcji i podsumowań w bazie danych (Supabase).
*   Wyświetlanie listy zapisanych podsumowań.
*   Edycja istniejących podsumowań.
*   Bezpieczny Dostęp: Wymagane uwierzytelnianie użytkownika.

**Ograniczenia:**

Wersja MVP **nie zawiera** następujących funkcji:

*   Eksportowania podsumowań do formatu Markdown.
*   Dodawania tagów do podsumowań.
*   Wyodrębniania zadań, decyzji lub otwartych kwestii - koncentruje się tylko na głównym podsumowaniu tematycznym.
*   Zaawansowanych możliwości formatowania tekstu.
*   Wyszukiwania podsumowań po nazwie lub treści.
*   Licznika znaków w interfejsie edycji.
*   Pomiaru czasu generowania podsumowania.

## Status Projektu

Ten projekt jest obecnie w fazie rozwoju, w etapie MVP (Minimum Viable Product).

## Licencja

Licencja MIT

```