# Dokument wymagań produktu (PRD) - Meeting Summarizer

## 1. Przegląd produktu

Aplikacja "Meeting Summarizer" ma na celu automatyzację procesu tworzenia podsumowań spotkań na podstawie transkrypcji w języku polskim. Docelowym użytkownikiem jest osoba techniczna, taka jak programista, odpowiedzialna za dokumentowanie spotkań. Aplikacja umożliwia wczytanie pliku tekstowego z transkrypcją, edycję transkrypcji, generowanie podsumowania za pomocą LLM (Large Language Model), edycję podsumowania oraz zapisanie transkrypcji i podsumowania w bazie danych. Użytkownik ma również możliwość przeglądania i edycji wcześniej zapisanych podsumowań. MVP (Minimum Viable Product) koncentruje się na podstawowych funkcjonalnościach, zapewniając szybkie i sprawne generowanie podsumowań.

## 2. Problem użytkownika

Osoby odpowiedzialne za prowadzenie dokumentacji spotkań i tworzenie podsumowań w języku polskim na podstawie transkrypcji w plikach tekstowych tracą czas na ręczne tworzenie tych podsumowań. Obecne metody są czasochłonne, monotonne i podatne na błędy interpretacyjne. Tworzenie podsumowań jest czasochłonne i odciąga od innych, bardziej strategicznych zadań.

## 3. Wymagania funkcjonalne

*   **Wczytywanie pliku tekstowego:** Umożliwienie wczytania pliku tekstowego (.txt) z dysku lokalnego. Obsługa plików o rozmiarze do 1 MB.
*   **Prezentacja pliku z edycją:** Wyświetlenie wczytanego tekstu transkrypcji w polu tekstowym z możliwością edycji (np. korekta literówek, usunięcie nieistotnych fragmentów). Prosta edycja tekstu (dodawanie, usuwanie, zmiana).
*   **Generowanie podsumowania (przycisk "Podsumuj"):** Wywołanie LLM (np. GPT-3.5 przez API lub lokalnej instancji ollama) po naciśnięciu przycisku "Podsumuj". Prompt ma za zadanie wygenerować krótkie (do 500 znaków) podsumowanie głównych tematów poruszonych na spotkaniu. Wyświetlanie standardowego spinnera podczas generowania podsumowania.
*   **Wyświetlanie i edycja podsumowania:** Wyświetlenie wygenerowanego podsumowania w polu tekstowym z możliwością edycji i poprawiania (użytkownik może poprawić podsumowanie wygenerowane przez LLM).
*   **Zapisywanie podsumowania:** Zapisanie oryginalnej transkrypcji i wygenerowanego/zmodyfikowanego podsumowania do bazy danych (np. Supabase). Zapisanie daty utworzenia i ostatniej modyfikacji (z dokładnością do minuty). Zapisanie w tekstowym pliku logów: timestamp, błąd, stack (jeśli dostępny) w przypadku wystąpienia błędów. Zmiany w transkrypcji i podsumowaniu zapisywane po naciśnięciu przycisku "Zapisz".
*   **Wyświetlanie listy podsumowań:** Wyświetlenie listy zapisanych podsumowań w formie tabeli z następującymi kolumnami: "Nazwa pliku", "Data utworzenia", "Data modyfikacji", "Akcje" (przycisk "Edytuj"). Lista podsumowań sortowana po dacie utworzenia (od najnowszych). Nazwa pliku wyświetlana w całości.
*   **Wyświetlanie i edycja podsumowania:** Po kliknięciu "Edytuj" wyświetlenie oryginalnej transkrypcji i podsumowania w trybie do edycji (jak w "Nowe podsumowanie"). Wyświetlanie ogólnego komunikatu o błędzie w okienku dialogowym w przypadku problemów z LLM lub wczytywaniem pliku. Komunikat o błędzie w okienku dialogowym z możliwością skopiowania do schowka.

## 4. Granice produktu

*   Brak eksportowania podsumowania do formatu Markdown.
*   Brak możliwości dodawania tagów do podsumowań.
*   Brak wyciągania zadań do wykonania, decyzji, otwartych kwestii. MVP skupia się tylko na ogólnym podsumowaniu tematycznym.
*   Aplikacja wymaga ręcznie przygotowanej transkrypcji.
*   Brak zaawansowanego formatowania tekstu. Ograniczone do podstawowej edycji tekstu.
*   Brak wyszukiwania podsumowań po nazwie pliku lub treści.
*   Brak licznika znaków w interfejsie edycji.
*   Aplikacja nie mierzy czasu generowania podsumowania w MVP.

## 5. Historyjki użytkowników

- US-001
- Wczytanie transkrypcji
- Jako użytkownik chcę móc wczytać transkrypcję spotkania z pliku TXT, aby móc ją przetworzyć.
- Kryteria akceptacji:
   - Użytkownik może wybrać plik TXT z dysku lokalnego.
   - Aplikacja poprawnie wczytuje plik TXT o rozmiarze do 1 MB.
   - Wczytany tekst transkrypcji jest wyświetlany w polu tekstowym.
   - W przypadku błędu wczytywania (np. plik nie istnieje, brak uprawnień, nie jest TXT) wyświetlany jest ogólny komunikat o błędzie w okienku dialogowym, a szczegóły błędu zapisywane są w logach.

- US-002
- Edycja transkrypcji
- Jako użytkownik chcę móc edytować transkrypcję przed wygenerowaniem podsumowania, aby poprawić ewentualne błędy i usunąć nieistotne fragmenty.
- Kryteria akceptacji:
   - Użytkownik może edytować tekst w polu tekstowym zawierającym transkrypcję.
   - Użytkownik może dodawać, usuwać i zmieniać tekst.
   - Aplikacja obsługuje kodowanie UTF-8.

- US-003
- Generowanie podsumowania
- Jako użytkownik chcę móc wygenerować podsumowanie transkrypcji za pomocą LLM, aby szybko uzyskać streszczenie najważniejszych tematów poruszonych na spotkaniu.
- Kryteria akceptacji:
   - Użytkownik może uruchomić proces generowania podsumowania poprzez naciśnięcie przycisku "Podsumuj".
   - Podczas generowania podsumowania wyświetlany jest standardowy spinner.
   - Po zakończeniu generowania podsumowania, wygenerowany tekst jest wyświetlany w polu tekstowym.
   - W przypadku błędu generowania podsumowania (np. problem z LLM) wyświetlany jest ogólny komunikat o błędzie w okienku dialogowym, a szczegóły błędu zapisywane są w logach.

- US-004
- Edycja podsumowania
- Jako użytkownik chcę móc edytować podsumowanie wygenerowane przez LLM, aby doprecyzować jego treść i poprawić ewentualne niedoskonałości.
- Kryteria akceptacji:
   - Użytkownik może edytować tekst w polu tekstowym zawierającym podsumowanie.
   - Użytkownik może dodawać, usuwać i zmieniać tekst.

- US-005
- Zapisywanie podsumowania
- Jako użytkownik chcę móc zapisać transkrypcję i podsumowanie w bazie danych, aby móc do nich wrócić w przyszłości.
- Kryteria akceptacji:
   - Użytkownik może zapisać transkrypcję i podsumowanie poprzez naciśnięcie przycisku "Zapisz".
   - Po zapisaniu wyświetlana jest informacja o pomyślnym zapisaniu.
   - Data utworzenia i ostatniej modyfikacji (z dokładnością do minuty) są zapisywane w bazie danych.
   - W przypadku błędu zapisu wyświetlany jest ogólny komunikat o błędzie w okienku dialogowym, a szczegóły błędu zapisywane są w logach.

- US-006
- Przeglądanie listy podsumowań
- Jako użytkownik chcę móc przeglądać listę zapisanych podsumowań, posortowaną po dacie utworzenia (od najnowszych), aby móc łatwo znaleźć potrzebne mi podsumowanie.
- Kryteria akceptacji:
   - Lista podsumowań jest wyświetlana w formie tabeli.
   - Tabela zawiera kolumny: "Nazwa pliku", "Data utworzenia", "Data modyfikacji", "Akcje" (przycisk "Edytuj").
   - Lista jest sortowana po dacie utworzenia (od najnowszych).
   - Nazwa pliku jest wyświetlana w całości.

- US-007
- Edycja istniejącego podsumowania
- Jako użytkownik chcę móc edytować istniejące podsumowanie, aby wprowadzić zmiany lub poprawki.
- Kryteria akceptacji:
   - Użytkownik może przejść do trybu edycji podsumowania poprzez kliknięcie przycisku "Edytuj" na liście podsumowań.
   - W trybie edycji wyświetlana jest oryginalna transkrypcja i podsumowanie.
   - Użytkownik może edytować transkrypcję i podsumowanie.
   - Użytkownik może zapisać zmiany.

- US-008
- Bezpieczny dostęp
- Jako użytkownik chcę żeby nikt niepowołany nie miał dostępu do moich podsumowań.
- Kryteria akceptacji:
   - Aplikacja wymaga podstawowego uwierzytelniania.
   - Tylko zalogowany użytkownik ma możliwość wglądu do podsumowań.

## 6. Metryki sukcesu

*   **Poprawne generowanie podsumowania:** Dla co najmniej 90% wczytanych plików aplikacja generuje podsumowanie, które jest spójne i adekwatne do treści transkrypcji (ocena subiektywna). Oznacza to, że podsumowanie odzwierciedla główne tematy poruszane w transkrypcji.
*   **Brak błędów krytycznych:** Aplikacja jest stabilna i nie generuje błędów uniemożliwiających jej używanie (np. błąd zapisu do bazy danych, zawieszanie się aplikacji). Brak zgłoszeń o krytycznych błędach od użytkowników.
*   **Zapisywanie i odczytywanie podsumowań:** Aplikacja poprawnie zapisuje i odczytuje podsumowania z bazy danych, zachowując integralność danych.

