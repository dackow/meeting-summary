# Dokument wymagań produktu (PRD) - Meeting Summarizer

## 1. Przegląd produktu
Meeting Summarizer to aplikacja webowa typu SPA (Single Page Application), która umożliwia generowanie podsumowań spotkań w języku polskim na podstawie dostarczonych plików tekstowych (.txt). Podsumowania są generowane z wykorzystaniem modeli LLM (OpenAI API oraz lokalnej instancji Ollama), a następnie mogą być edytowane i zapisywane lokalnie oraz w bazie danych Supabase.

## 2. Problem użytkownika
Użytkownicy nie mają efektywnego sposobu na szybkie streszczanie spotkań prowadzonych po polsku na podstawie transkrypcji. Ręczne przygotowywanie podsumowań jest czasochłonne i nieoptymalne. Potrzebne jest proste narzędzie, które pozwoli na wygodne tworzenie, edycję i przeglądanie podsumowań z plików .txt.

## 3. Wymagania funkcjonalne
1. Wczytywanie pojedynczego pliku tekstowego (.txt).
2. Prezentowanie wczytanego pliku w edytowalnej formie (jedno zdanie = jedna linia).
3. Generowanie podsumowania za pomocą LLM (OpenAI lub Ollama).
4. Edycja wygenerowanego podsumowania.
5. Zapis podsumowania i transkrypcji lokalnie jako oddzielne pliki .txt — po kliknięciu "Zapisz" aplikacja wywołuje dwa kolejne dialogi zapisu (najpierw podsumowanie, potem transkrypcja), wykorzystując File System Access API lub `<a download>`.
6. Przechowywanie metadanych, UUID oraz treści podsumowania w bazie danych Supabase.
7. Przeglądanie listy zapisanych podsumowań (na podstawie danych z Supabase), sortowanej malejąco po dacie.
8. Logowanie błędów do konsoli deweloperskiej.
9. Uwierzytelnienie użytkownika (bez różnicowania rôl).

## 4. Granice produktu
- Brak wsparcia dla wielu języków (tylko polski).
- Brak wsparcia dla wielu plików na raz (jedna transkrypcja na raz).
- Brak eksportu do markdown, tagów, wersjonowania i usuwania podsumowań.
- Brak odzyskiwania lub ponownego przypisywania plików lokalnych.
- Brak automatycznego zapisu (tylko przycisk "Zapisz").
- Brak wyszukiwania lub filtrowania podsumowań.
- Brak wsparcia dla pracy w trybie offline.

## 5. Historyjki użytkowników

### US-001 - Wczytanie pliku
- Tytuł: Wczytanie transkrypcji
- Opis: Jako użytkownik chcę wczytać plik tekstowy (.txt), aby uzyskać dostęp do jego treści.
- Kryteria akceptacji:
  - Użytkownik może wskazać plik z rozszerzeniem .txt
  - Aplikacja prezentuje zawartość pliku w formie edytowalnej

### US-002 - Generowanie podsumowania
- Tytuł: Generowanie podsumowania z transkrypcji
- Opis: Jako użytkownik chcę kliknąć przycisk "Podsumuj", aby uzyskać automatyczne podsumowanie transkrypcji.
- Kryteria akceptacji:
  - Użytkownik widzi przycisk "Podsumuj"
  - Po kliknięciu generowane jest podsumowanie (użyty LLM)
  - Podsumowanie jest widoczne i edytowalne

### US-003 - Zapis podsumowania i transkrypcji
- Tytuł: Zapisanie podsumowania i transkrypcji
- Opis: Jako użytkownik chcę zapisać podsumowanie i transkrypcję lokalnie, aby mieć do nich dostęp.
- Kryteria akceptacji:
  - Kliknięcie przycisku "Zapisz" uruchamia dwa kolejne dialogi zapisu (najpierw podsumowanie, potem transkrypcja)
  - Użytkownik może wybrać lokalizację zapisu dla każdego pliku
  - Treść podsumowania jest dodatkowo zapisywana w bazie danych Supabase
  - UUID i metadane zapisane w bazie danych

### US-004 - Przeglądanie podsumowań
- Tytuł: Przeglądanie listy zapisanych podsumowań
- Opis: Jako użytkownik chcę przeglądać moje zapisane podsumowania, żeby je edytować lub przeglądać.
- Kryteria akceptacji:
  - Lista sortowana malejąco po dacie utworzenia
  - Widoczna nazwa oryginalnego pliku i data
  - Kliknięcie otwiera edytowalny widok podsumowania (pobrany z Supabase)

### US-005 - Uwierzytelnienie użytkownika
- Tytuł: Logowanie
- Opis: Jako użytkownik chcę się zalogować, aby mieć dostęp do moich danych.
- Kryteria akceptacji:
  - Formularz logowania jest obecny przy starcie aplikacji
  - Po zalogowaniu dane są przypisane do użytkownika

## 6. Metryki sukcesu
- 100% transkrypcji powinno umożliwić wygenerowanie podsumowania (o ile plik nie jest pusty lub błędny).
- Wszystkie dane powinny być poprawnie zapisane lokalnie i zarejestrowane w bazie danych z UUID.
- Podsumowania są dostępne i edytowalne bez potrzeby ponownego wczytywania plików.
- Użytkownik może przeglądać i edytować podsumowania bez potrzeby ponownego generowania.
- Brak występowania podwójnych podsumowań dla tej samej transkrypcji.

