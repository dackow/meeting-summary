# Architektura UI dla Meeting Summarizer

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika dla Meeting Summarizer MVP wykorzystuje minimalistyczny układ strony z globalnym nagłówkiem (topbar) zawierającym nawigację, który jest widoczny na stronach wymagających uwierzytelnienia. Główny obszar zawartości pod topbarem dynamicznie ładuje widoki (Lista Podsumowań, Formularz Podsumowania - Tworzenie/Edycja). Strona logowania stanowi odrębny widok bez globalnej nawigacji. Aplikacja zbudowana jest z wykorzystaniem Astro do routingu i stron, a interaktywne części (widoki listy i formularza) są implementowane w React, stylizowane za pomocą Tailwind CSS i opierają się na kluczowych komponentach biblioteki shadcn/ui. Komunikacja z backendem odbywa się poprzez REST API. Zarządzanie stanem widoków realizowane jest przy użyciu hooków Reacta (`useState`, `useEffect`). Krytyczne błędy API są wyświetlane inline w kontekście akcji, która je wywołała. Komunikaty sukcesu oraz błędy walidacji frontendowej (np. rozmiar pliku) są prezentowane użytkownikowi w formie globalnych powiadomień "toast" (`Toast`) z shadcn/ui. Uwierzytelnienie użytkownika jest obsługiwane przez Supabase Auth z wykorzystaniem JWT (zarządzane przez Supabase SDK) i egzekwowane na poziomie frontendowym przez sprawdzanie sesji Supabase przed załadowaniem chronionych widoków.

## 2. Lista widoków

**Nazwa widoku:** Strona Logowania

*   **Ścieżka widoku:** `/login`
*   **Główny cel:** Umożliwienie użytkownikowi zalogowania się do aplikacji.
*   **Kluczowe informacje do wyświetlenia:** Formularz z polami na email i hasło. Ewentualny komunikat o błędzie logowania (inline w formularzu).
*   **Kluczowe komponenty widoku:**
    *   Formularz (`<form>`).
    *   Pole tekstowe Email (`Input` z `Label`, shadcn/ui).
    *   Pole hasła (`Input` z `Label`, shadcn/ui).
    *   Przycisk "Zaloguj" (`Button`, shadcn/ui).
    *   Obszar wyświetlania błędów logowania (np. `<p class="text-red-500">`) inline w formularzu.
*   **UX, dostępność i względy bezpieczeństwa:** Prosty, zrozumiały formularz. Pola z odpowiednimi etykietami (`Label` dla dostępności). Przycisk submit. Bezpieczeństwo: Formularz przesyła dane logowania do API Supabase; frontend nie przechowuje poświadczeń. Widok nie zawiera globalnej nawigacji. Błędy logowania są wyświetlane bezpośrednio w kontekście formularza.

**Nazwa widoku:** Strona Listy Podsumowań

*   **Ścieżka widoku:** `/summaries`
*   **Główny cel:** Wyświetlenie listy zapisanych podsumowań użytkownika, umożliwienie filtrowania/sortowania oraz nawigacji do widoku edycji lub tworzenia nowego podsumowania.
*   **Kluczowe informacje do wyświetlenia:** Tabela podsumowań z kolumnami "Nazwa pliku", "Data utworzenia", "Data modyfikacji", "Akcje". Pola do filtrowania listy po zakresie dat utworzenia. Przycisk do tworzenia nowego podsumowania. Wskaźniki sortowania w nagłówkach kolumn. Ewentualny komunikat o błędzie ładowania listy (inline).
*   **Kluczowe komponenty widoku:**
    *   Globalny Topbar (zawiera `NavigationMenu` z shadcn/ui).
    *   Kontener do filtrowania dat (`div` z układem flex).
    *   Pole daty "Od" (`Input type="date"` z `Label`, shadcn/ui).
    *   Pole daty "Do" (`Input type="date"` z `Label`, shadcn/ui).
    *   Przycisk "Filtruj" (`Button`, shadcn/ui).
    *   Przycisk "Nowe podsumowanie" (`Button`, shadcn/ui, umieszczony w prawym górnym rogu sekcji listy jako dodatkowy skrót).
    *   Tabela danych (`Table`, shadcn/ui).
    *   Nagłówki tabeli (`<th>`) z możliwością kliknięcia dla sortowania dat, zawierające wskaźnik sortowania (ikonę).
    *   Wiersze tabeli (`<tr>`) wyświetlające dane podsumowań.
    *   Przycisk "Edytuj" (`Button`, shadcn/ui) w kolumnie "Akcje" dla każdego wiersza.
    *   Spinner ładowania danych tabeli.
    *   Komunikat o pustej liście podsumowań.
    *   Obszar wyświetlania błędów ładowania listy (np. `<p class="text-red-500">`) inline, np. nad tabelą.
*   **UX, dostępność i względy bezpieczeństwa:** Tabela zapewnia czytelny przegląd danych. Sortowanie i filtrowanie ułatwiają znalezienie potrzebnego podsumowania. Przyciski "Edytuj" zapewniają bezpośredni dostęp do detali. Przycisk "Nowe podsumowanie" jest łatwo dostępny. Błędy są wyświetlane inline, co ułatwia powiązanie błędu z kontekstem tabeli. Dostępność: Tabele z poprawną semantyką. Bezpieczeństwo: Dane są pobierane tylko dla zalogowanego użytkownika za pomocą API chronionego RLS. Widok chroniony, wymaga uwierzytelnienia.

**Nazwa widoku:** Formularz Podsumowania (Tworzenie / Edycja)

*   **Ścieżka widoku:** `/create` (Tworzenie), `/edit/:id` (Edycja)
*   **Główny cel:** Umożliwienie wczytania transkrypcji, jej edycji, wygenerowania podsumowania, edycji podsumowania i zapisania całości.
*   **Kluczowe informacje do wyświetlenia:** Pole tekstowe na transkrypcję, pole tekstowe na podsumowanie. Kontrolka wczytywania pliku. Przyciski akcji ("Podsumuj", "Zapisz", "Anuluj"). Nazwa pliku (tylko w trybie edycji). Komunikaty o błędach LLM lub zapisu (inline).
*   **Kluczowe komponenty widoku:**
    *   Globalny Topbar (zawiera `NavigationMenu` z shadcn/ui).
    *   Kontener formularza (np. `div`).
    *   Sekcja kontroli wczytywania pliku.
    *   Wizualnie ukryty input pliku (`<input type="file">`, `accept=".txt"`).
    *   Stylizowana etykieta (`<label>`) dla inputu pliku, wyglądająca jak przycisk "Wczytaj plik TXT (max 1 MB)" (wykorzystanie stylów `Button` i `Label` z shadcn/ui).
    *   Wyświetlanie nazwy wczytanego pliku.
    *   Pole tekstowe Transkrypcja (np. `Textarea`-like, shadcn/ui stylizacja).
    *   Pole tekstowe Podsumowanie (np. `Textarea`-like, shadcn/ui stylizacja).
    *   Sekcja przycisków akcji (`div` z `justify-end`).
    *   Przycisk "Podsumuj" (`Button`, shadcn/ui, wyłączony gdy transkrypcja pusta, ze spinnerem podczas ładowania).
    *   Przycisk "Zapisz" (`Button`, shadcn/ui, wyłączony gdy podsumowanie puste, ze spinnerem podczas ładowania).
    *   Przycisk "Anuluj" (`Button`, shadcn/ui).
    *   Stopka w trybie edycji wyświetlająca nazwę pliku.
    *   Obszar wyświetlania błędów (np. `<p class="text-red-500">`) inline w obszarze formularza, np. nad przyciskami akcji, lub specyficznie pod przyciskiem "Podsumuj" dla błędów LLM.
    *   Globalne Powiadomienia Toast (`Toast`, shadcn/ui) do potwierdzeń zapisu i błędów walidacji rozmiaru pliku.
*   **UX, dostępność i względy bezpieczeństwa:** Wyraźne pola do wprowadzania tekstu. Statusy przycisków informujące o możliwości wykonania akcji. Spinner informujący o trwających operacjach. Przycisk "Anuluj" umożliwia wyjście bez zapisu. Błędy API wyświetlane są inline, w kontekście akcji, która je wywołała (np. podsumowanie, zapis), co ułatwia użytkownikowi zrozumienie problemu. Toast dla potwierdzeń jest mniej inwazyjny. Dostępność: Semantyczne etykiety (`Label`), obsługa klawiatury (zapewniana przez shadcn/ui). Bezpieczeństwo: Dane przesyłane do API podlegają walidacji i RLS. Frontendowa walidacja rozmiaru pliku zapobiega wysyłaniu zbyt dużych danych. Widok chroniony, wymaga uwierzytelnienia.

## 3. Mapa podróży użytkownika

Główna podróż użytkownika w aplikacji Meeting Summarizer wygląda następująco:

1.  **Wejście do aplikacji / Uwierzytelnienie:** Użytkownik wchodzi na adres aplikacji. Strony `/summaries`, `/create`, `/edit/:id` są chronione. Jeśli użytkownik nie jest zalogowany (brak aktywnej sesji Supabase), jest automatycznie przekierowywany na stronę `/login`.
2.  **Logowanie:** Na stronie `/login`, użytkownik podaje email i hasło, a następnie klika "Zaloguj". W przypadku sukcesu (Supabase SDK potwierdza sesję), następuje przekierowanie na `/summaries`. W przypadku błędu logowania, komunikat o błędzie jest wyświetlany inline w obszarze formularza logowania.
3.  **Przeglądanie listy:** Po zalogowaniu, użytkownik ląduje na stronie `/summaries`. Nad głównym kontentem widzi topbar nawigacyjny. Widzi tabelę ze swoimi zapisanymi podsumowaniami, domyślnie posortowaną od najnowszych. Może filtrować listę według daty utworzenia za pomocą pól "Od" i "Do" i przycisku "Filtruj". Może również kliknąć nagłówki kolumn "Data utworzenia" i "Data modyfikacji" aby zmienić sortowanie listy. Z topbara może przejść do "Nowe podsumowanie" lub "Wyloguj". Jeśli ładowanie listy zakończy się błędem API, komunikat o błędzie jest wyświetlany inline, np. nad tabelą.
4.  **Tworzenie nowego podsumowania:** Z poziomu listy `/summaries` (klikając przycisk obok tabeli) lub z topbara (klikając link "Nowe podsumowanie"), użytkownik przechodzi na formularz podsumowania pod ścieżką `/create`.
    *   Na formularzu `/create`, użytkownik klika "Wczytaj plik TXT..." aby wybrać plik z dysku. Tekst z pliku pojawia się w polu "Transkrypcja". Jeśli plik jest za duży, wyświetlany jest toast z błędem.
    *   (Opcjonalnie) Użytkownik edytuje tekst w polu "Transkrypcja".
    *   Użytkownik klika "Podsumuj" (jeśli pole Transkrypcja nie jest puste). Pojawia się spinner, API LLM (`POST /api/generate-summary`) jest wywoływane. Po zakończeniu, wygenerowany tekst pojawia się w polu "Podsumowanie". W przypadku błędu API/LLM, komunikat o błędzie jest wyświetlany inline, np. pod przyciskiem "Podsumuj".
    *   (Opcjonalnie) Użytkownik edytuje tekst w polu "Podsumowanie".
    *   Użytkownik klika "Zapisz" (jeśli pole Podsumowanie nie jest puste). Pojawia się spinner, API `POST /api/summaries` jest wywoływane. Po sukcesie, wyświetlany jest toast "Zmiany zapisane" i użytkownik jest przekierowywany z powrotem na `/summaries`. W przypadku błędu API, komunikat o błędzie jest wyświetlany inline, np. nad przyciskami akcji formularza.
    *   Alternatywnie, użytkownik klika "Anuluj" (lub link "Moje podsumowania" w topbarze) aby wrócić do `/summaries` bez zapisywania.
5.  **Edycja istniejącego podsumowania:** Z poziomu listy `/summaries`, użytkownik klika przycisk "Edytuj" przy wybranym podsumowaniu. Zostaje przekierowany na formularz podsumowania pod ścieżką `/edit/:id`.
    *   Na formularzu `/edit/:id`, dane (transkrypcja, podsumowanie) są pobierane z API `GET /api/summaries/{id}` i wyświetlane w polach tekstowych. Nazwa pliku jest wyświetlana w stopce. Widoczny jest topbar nawigacyjny. W przypadku błędu ładowania danych podsumowania, komunikat o błędzie jest wyświetlany inline, np. na górze formularza.
    *   Użytkownik edytuje tekst w polach "Transkrypcja" lub "Podsumowanie". Przycisk "Podsumuj" jest dostępny, jeśli użytkownik chce ponownie wygenerować podsumowanie po zmianach w transkrypcji.
    *   Użytkownik klika "Zapisz" (jeśli pole Podsumowanie nie jest puste). Pojawia się spinner, API `PUT /api/summaries/{id}` jest wywoływane. Po sukcesie, wyświetlany jest toast "Zmiany zapisane" i użytkownik jest przekierowywany z powrotem na `/summaries`. W przypadku błędu API, komunikat o błędzie jest wyświetlany inline, np. nad przyciskami akcji formularza.
    *   Alternatywnie, użytkownik klika "Anuluj" (lub link "Moje podsumowania" w topbarze) aby wrócić do `/summaries` bez zapisywania.
6.  **Wylogowanie:** Z dowolnej strony z widocznym topbarem, użytkownik klika "Wyloguj". Supabase SDK obsługuje wylogowanie, a użytkownik jest przekierowywany na stronę `/login`.

## 4. Układ i struktura nawigacji

Układ strony składa się z:
1.  **Globalnego Topbara:** Widoczny na wszystkich chronionych stronach (`/summaries`, `/create`, `/edit/:id`). Zawiera komponent `NavigationMenu` z shadcn/ui, z linkami do "Moje podsumowania" (`/summaries`) i "Nowe podsumowanie" (`/create`), oraz przyciskiem/linkiem "Wyloguj". Zapewnia spójny sposób poruszania się po głównych sekcjach aplikacji po zalogowaniu. Strona logowania `/login` nie zawiera topbara.
2.  **Głównego Obszaru Zawartości:** Znajduje się poniżej topbara (na chronionych stronach) lub wypełnia całą wysokość (na stronie logowania). Renderuje aktualnie aktywny widok (Strona Logowania, Lista Podsumowań lub Formularz Podsumowania). Jego zawartość zmienia się w zależności od aktualnej ścieżki URL. Obszar ten zawiera również miejsca na wyświetlanie inline komunikatów o błędach specyficznych dla danego widoku.
3.  **Globalnych Komponentów UI:** Powiadomienia Toast (`Toast`) są renderowane na najwyższym poziomie aplikacji (np. w komponencie Layout), dzięki czemu mogą być wywoływane z dowolnego miejsca w aplikacji i pojawiać się niezależnie od aktualnie wyświetlanego widoku, nie przerywając interakcji (dla komunikatów nietrwałych i niekrytycznych). Modal Błędów (`Dialog`/`AlertDialog`) nie jest wykorzystywany dla krytycznych błędów API w MVP, ale może być dostępny w kodzie jako narzędzie do innych celów modalnych w przyszłości.

Struktura nawigacji opiera się na routingu Astro:
*   **`/login`:** Publiczny punkt wejścia/wyjścia do aplikacji. Brak topbara.
*   **`/summaries`:** Główny widok po zalogowaniu. Dostępny poprzez bezpośredni URL po uwierzytelnieniu lub kliknięcie "Moje podsumowania" w topbarze lub powrót z formularza. Zawiera kontekstowe przyciski akcji ("Edytuj", "Nowe podsumowanie") i pola filtrowania/sortowania.
*   **`/create`:** Widok formularza do tworzenia. Dostępny poprzez kliknięcie "Nowe podsumowanie" na liście lub w topbarze. Zawiera kontekstowe przyciski akcji ("Podsumuj", "Zapisz", "Anuluj").
*   **`/edit/:id`:** Widok formularza do edycji. Dostępny poprzez kliknięcie "Edytuj" na liście. Zawiera kontekstowe przyciski akcji ("Podsumuj", "Zapisz", "Anuluj").

Uwierzytelnienie jest egzekwowane przez sprawdzenie sesji Supabase na poziomie stron Astro (`.astro`) dla chronionych tras.

## 5. Kluczowe komponenty

W architekturze UI wykorzystane zostaną następujące kluczowe komponenty, w większości pochodzące z biblioteki shadcn/ui, w celu zapewnienia spójności i przyspieszenia rozwoju:

*   **NavigationMenu (`shadcn/ui`):** Główny komponent topbara nawigacyjnego, zawierający linki do kluczowych sekcji aplikacji po zalogowaniu oraz opcję wylogowania.
*   **Button (`shadcn/ui`):** Wykorzystywany dla wszystkich interaktywnych przycisków akcji w aplikacji (Loguj, Wczytaj plik - jako styl dla labela, Podsumuj, Zapisz, Anuluj, Filtruj, Nowe podsumowanie, Edytuj, Wyloguj). Wspiera stany aktywny/nieaktywny (`disabled`) oraz wizualizację ładowania (np. poprzez spinner).
*   **Input / Textarea (`shadcn/ui`-like stylizacja):** Podstawowe komponenty dla pól tekstowych (email, hasło, daty filtrowania) oraz obszarów tekstowych dla transkrypcji i podsumowania. Wspierają podstawową edycję tekstu.
*   **Label (`shadcn/ui`):** Używane do etykietowania pól formularza i inputu pliku, poprawiając dostępność i powiązanie etykiety z kontrolką formularza.
*   **Table (`shadcn/ui`):** Komponent do wyświetlania danych w formie tabelarycznej na stronie listy podsumowań, włączając sortowalne nagłówki (z ikonami) i wiersze z akcjami (przycisk "Edytuj").
*   **Inline Error Display Element:** Generyczny element (np. `<p>` lub `<div>` z klasą `text-red-500`) renderowany warunkowo wewnątrz widoku, w pobliżu akcji lub sekcji, która wywołała krytyczny błąd API (np. pod przyciskiem "Podsumuj", nad przyciskami "Zapisz"/"Anuluj", nad tabelą listy). Wykorzystuje lokalny stan błędu komponentu.
*   **Toast (`shadcn/ui`):** Komponent systemu powiadomień typu "toast", używany do krótkotrwałych, nietrwałych komunikatów, takich jak potwierdzenie pomyślnego zapisu ("Zmiany zapisane") czy błąd walidacji rozmiaru pliku ("Plik jest za duży (max 1 MB)"). Zarządzany globalnie (np. przez Context API).
*   **Spinner:** Wizualny wskaźnik ładowania/przetwarzania, używany podczas operacji wymagających czasu (np. generowanie podsumowania, zapis, ładowanie danych listy, logowanie). Może być zintegrowany w komponenty `Button`.
*   **File Input Control:** Niestandardowa kontrolka UI składająca się z wizualnie ukrytego `<input type="file">` i stylizowanego elementu `<label>` wyglądającego jak przycisk (`Button`), wraz z logiką wyświetlania nazwy wybranego pliku i frontendową walidacją rozmiaru pliku (do 1 MB).