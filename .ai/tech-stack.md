# Stos technologiczny - Meeting Summarizer

## Frontend
- **Astro** – framework do budowy lekkich aplikacji typu SPA
- **React** – dynamiczne komponenty UI
- **Tailwind CSS** – szybkie i spójne stylowanie interfejsu
- **sessionStorage** – przechowywanie flag sesyjnych w przeglądarce
- **File System Access API / `<a download>`** – zapis lokalny plików przez dialog

## Backend i logika aplikacyjna
- **TypeScript** – typowany język do obsługi logiki aplikacji
- **Zustand** lub **React Context API** – zarządzanie stanem aplikacji
- **uuid (biblioteka)** – generowanie unikalnych identyfikatorów plików i rekordów

## LLM i przetwarzanie
- **OpenAI API** – zewnętrzny model językowy do generowania podsumowań
- **Ollama (lokalna instancja)** – alternatywne lokalne generowanie podsumowań

## Przechowywanie danych
- **Supabase (PostgreSQL)** – baza danych na potrzeby metadanych, UUID i treści podsumowań
- **Supabase Auth** – mechanizm logowania użytkowników

## Dodatkowe narzędzia developerskie
- **Vite** – szybki bundler frontendowy
- **ESLint + Prettier** – jakość i formatowanie kodu
- **Jest / Vitest** – testy jednostkowe
- **Playwright / Cypress** – testy end-to-end

## Uwagi
- Aplikacja nie wspiera trybu offline.
- Nie zapisuje plików w stałej lokalizacji – użytkownik wybiera miejsce zapisu przy każdej operacji.
- Logowanie błędów odbywa się do konsoli deweloperskiej (brak pliku log.txt).

