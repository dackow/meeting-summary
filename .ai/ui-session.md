<conversation_summary>
<decisions>
1.  Minimalistyczny układ strony z globalnym topbarem nawigacyjnym na stronach chronionych i dynamicznym obszarem zawartości dla widoków listy i edycji. Strona logowania bez topbara.
2.  Standardowy `<input type="file">` ukryty wizualnie, z klikalnym elementem `<label>` stylizowanym jako przycisk "Wczytaj plik TXT (max 1 MB)". Nazwa pliku będzie wyświetlana po wczytaniu. Walidacja rozmiaru pliku do 1 MB zostanie zaimplementowana na frontendzie.
3.  Przyciski akcji ("Podsumuj", "Zapisz") i "Anuluj" zostaną umieszczone na dole ekranu edycji/tworzenia, wyrównane do prawej. Przycisk "Anuluj" nie wymaga potwierdzenia.
4.  Przyciski "Podsumuj" (jeśli transkrypcja pusta) i "Zapisz" (jeśli podsumowanie puste) powinny być wyszarzone (nieaktywne) wizualnie (klasy Tailwind `opacity-50 cursor-not-allowed`).
5.  **Krytyczne błędy API (np. błąd LLM, błąd zapisu do bazy danych, błąd wczytywania podsumowania) będą wyświetlane inline w obszarze widoku, w którym wystąpiły (np. w pobliżu przycisku "Podsumuj" lub "Zapisz", lub na górze formularza).**
6.  Zarządzanie stanem aplikacji (dane formularzy, stany ładowania, błędy API, stany filtrów/sortowania listy) będzie realizowane za pomocą podstawowych hooków React (`useState`, `useEffect`). Lokalne stany błędów będą używane do wyświetlania komunikatów inline.
7.  Responsywność interfejsu na różnych urządzeniach nie jest brana pod uwagę w MVP.
8.  Na ekranie listy podsumowań będą dostępne dwa pola typu date (`<input type="date">`) z etykietami "Od" i "Do" do filtrowania listy po dacie utworzenia.
9.  Tabela listy podsumowań będzie miała klikalne nagłówki kolumn "Data utworzenia" i "Data modyfikacji" do sortowania. Domyślne sortowanie to "Data utworzenia" malejąco (od najnowszych). Kliknięcie na nagłówek aktualnie sortowanej kolumny przełącza kierunek (DESC/ASC); kliknięcie na inny nagłówek ustawia sortowanie na tę kolumnę malejąco (DESC). Aktywna kolumna i kierunek sortowania będą wskazywane ikoną.
10. **Komunikaty sukcesu (np. pomyślny zapis) oraz błędy walidacji frontendowej (np. plik za duży) będą wyświetlane jako powiadomienia typu "toast".** Treść toastu dla sukcesu zapisu: "Zmiany zapisane".
11. Aplikacja będzie wymagała podstawowego uwierzytelnienia za pomocą Supabase Auth SDK. Próba dostępu do chronionych stron (lista, tworzenie, edycja) bez zalogowania będzie skutkować przekierowaniem na dedykowaną stronę logowania. Ręczne zarządzanie JWT na frontendzie zostanie odroczone.
12. W MVP nie będzie dodatkowego wizualnego wskaźnika "zmian niezapisanych" na ekranie edycji.
13. Nazwa pliku (jeśli istnieje) będzie wyświetlana tylko w stopce sekcji edycji istniejącego podsumowania.
14. Przycisk "Nowe podsumowanie" zostanie umieszczony również w prawym górnym rogu sekcji zawierającej tabelę listy podsumowań (jako dodatkowy skrót).
15. Strona logowania (`/login`) będzie minimalnym formularzem z polami email i hasło oraz przyciskiem "Zaloguj". Bez funkcji rejestracji w MVP.
16. **Błąd przekroczenia rozmiaru pliku (powyżej 1 MB) zostanie zgłoszony użytkownikowi jako toast (jak w decyzji 10).**
17. Gdzie możliwe, wykorzystane zostaną główne komponenty shadcn/ui.
18. Globalny topbar nawigacyjny (komponent `NavigationMenu` z shadcn/ui) będzie zawierał linki "Moje podsumowania" (`/summaries`), "Nowe podsumowanie" (`/create`) oraz przycisk "Wyloguj". Będzie widoczny na stronach `/summaries`, `/create`, `/edit/:id`.
</decisions>
<matched_recommendations>
1.  Zastosować minimalistyczny układ strony z globalnym topbarem (komponent `NavigationMenu` z shadcn/ui) na stronach chronionych i głównym obszarem kontenera (np. `div` z klasami `container mx-auto p-4`), gdzie dynamicznie będą renderowane widoki listy i edycji. Strona logowania będzie bez topbara.
2.  Stworzyć komponent React renderujący wizualnie ukryty `<input type="file" accept=".txt">` i stylizowany `<label>` (np. `bg-blue-500 text-white py-2 px-4 rounded cursor-pointer`) z tekstem "Wczytaj plik TXT (max 1 MB)". Po wczytaniu, wyświetlać nazwę pliku w pobliżu labela. **Rozważyć użycie komponentu `Input` z shadcn/ui jako bazowego elementu stylizacji dla inputu, oraz `Button` i `Label` dla stylizowanej kontrolki wyboru pliku.**
3.  Umieścić grupę przycisków akcji ("Podsumuj", "Zapisz", "Anuluj") w kontenerze na dole formularza edycji/tworzenia, używając klas Tailwind do wyrównania ich do prawej (np. `flex justify-end space-x-2 mt-4`). **Wykorzystać komponent `Button` z shadcn/ui dla wszystkich przycisków akcji.**
4.  Ustawić atrybut `disabled` na przycisku "Podsumuj" warunkowo na `true` gdy `transcription.trim() === ''`. Ustawić `disabled` na przycisku "Zapisz" na `true` gdy `summary.trim() === ''`. Komponent `Button` z shadcn/ui wspiera atrybut `disabled` i odpowiednie style.
5.  **Zaimplementować wyświetlanie krytycznych błędów API (np. z endpointów LLM, POST/PUT/GET summaries) inline w odpowiednim miejscu w komponencie widoku (np. pod przyciskiem "Podsumuj", nad przyciskami akcji "Zapisz"/"Anuluj", lub w sekcji tabeli dla błędów ładowania listy). Użyć lokalnego stanu `error` w komponencie i warunkowo renderować element tekstowy (np. `<p class="text-red-500">`) z komunikatem błędu.** Komponenty `Dialog`/`AlertDialog` z shadcn/ui mogą być zarezerwowane dla innych typów modalnych okienek, jeśli zajdzie taka potrzeba w przyszłości, ale nie będą używane dla tych konkretnych błędów API w MVP.
6.  W komponentach edycji/tworzenia oraz listy, używać hooków `useState`: `transcription`, `summary`, `isLoadingGenerate`, `isLoadingSave`, `error` (dla błędów API do wyświetlenia inline), `summaries`, `isLoadingList`, `dateFrom`, `dateTo`, `sortBy`, `sortOrder`. Używać `useEffect` do asynchronicznego pobierania danych.
7.  Nad tabelą listy, dodać dwa elementy `<input type="date">` z etykietami ("Od", "Do") i przycisk "Filtruj", umieszczone np. w `div` z klasą `flex gap-4 mb-4 items-center`. **Rozważyć użycie komponentu `Input` z `type="date"` oraz komponentu `Label` i `Button` z shadcn/ui dla tych elementów.**
8.  Wewnątrz `<th>` dla kolumn datowych, umieścić tekst nagłówka i warunkowo renderowaną ikonę z Lucide React (np. `ChevronUp` dla ASC, `ChevronDown` dla DESC) obok tekstu, gdy kolumna jest sortowana. Zaimplementować logikę w handlerze kliknięcia, która aktualizuje stan `sortBy` i `sortOrder`. **Rozważyć użycie komponentu `Table` z shadcn/ui jako podstawy do budowy tabeli listy podsumowań.**
9.  W plikach `.astro` dla tras `/summaries`, `/create`, `/edit/[id]`, użyć Supabase SDK do sprawdzenia sesji. Jeśli sesja nie istnieje, wywołać `Astro.redirect('/login')`. Jeśli sesja istnieje, renderować layout strony *zawierający komponent `GlobalHeader` (topbar)*. Strona `/login.astro` powinna być publicznie dostępna i renderować layout *bez komponentu `GlobalHeader`*.
10. W dolnej części sekcji edycji (np. `div` pod polami tekstowymi), warunkowo renderować tekst "Plik: {fileName}" jeśli `fileName` jest dostępny w stanie komponentu.
11. **Zaimplementować globalny system toastów (np. poprzez Context API) z funkcją `showToast(message)`. Po udanym zapisie (POST lub PUT API), wywołać `showToast('Zmiany zapisane')`.** **Wykorzystać komponent `Toast` z shadcn/ui do wyświetlania powiadomień o sukcesie (zapis) i błędach walidacji (plik za duży).**
12. W handlerze `onChange` dla inputu pliku, po uzyskaniu obiektu `file`, sprawdzić `if (file && file.size > 1 * 1024 * 1024)`. Jeśli true, zresetować input (`event.target.value = ''`) i wywołać `showToast('Plik jest za duży (max 1 MB)')`.
13. Stworzyć komponent React dla strony logowania (`/login`) zawierający element `form`, wewnątrz którego znajdą się dwa `div`-y dla pól email i hasła (każdy z `<label>` i `<input type="text/password">`) oraz przycisk `<button type="submit">Zaloguj</button>` na dole formularza. Używać prostych klas Tailwind do stylizacji. **Zastosować komponenty `Input`, `Label` i `Button` z shadcn/ui w formularzu logowania.** Strona ta będzie renderowana *bez globalnego topbara*.
14. Umieścić przycisk "Nowe podsumowanie" (komponent `Button` z shadcn/ui) w prawym górnym rogu sekcji zawierającej tabelę listy podsumowań (również, pomimo obecności linku w topbarze).
15. Stworzyć komponent `GlobalHeader` renderujący `NavigationMenu` z shadcn/ui. Wewnątrz `NavigationMenuContent` umieścić `NavigationMenuItem` z `NavigationMenuLink` do `/summaries` ("Moje podsumowania") i `/create` ("Nowe podsumowanie"). Dodać przycisk "Wyloguj" (komponent `Button` obsługujący akcję wylogowania przez Supabase SDK) poza `NavigationMenu`, ale w tym samym topbarze. Ten komponent `GlobalHeader` będzie renderowany warunkowo na stronach chronionych (np. w głównym komponencie Layout dla tych tras).
</matched_recommendations>

<ui_architecture_planning_summary>
Podsumowanie planowania architektury UI dla MVP Meeting Summarizer zakłada budowę minimalistycznej aplikacji webowej, z wykorzystaniem Astro, React, Tailwind CSS i Supabase. Kluczową decyzją jest wykorzystanie głównych komponentów biblioteki shadcn/ui wszędzie tam, gdzie jest to możliwe, w celu przyspieszenia rozwoju i zapewnienia spójnego wyglądu i zachowania. Aplikacja będzie posiadać globalny topbar nawigacyjny (komponent `NavigationMenu` z shadcn/ui) widoczny na chronionych stronach.

**Główne wymagania UI:** Wczytywanie/edycja transkrypcji i podsumowania, generowanie podsumowania LLM, zapis/odczyt z DB, przeglądanie listy podsumowań, uwierzytelnienie użytkownika przez Supabase Auth SDK.

**Strategia wyświetlania błędów i powiadomień:** Krytyczne błędy API (LLM, zapis, wczytanie) będą wyświetlane *inline* w obszarze widoku, w którym wystąpiły, przy użyciu lokalnego stanu błędu. Komunikaty sukcesu (zapis) i błędy walidacji frontendowej (plik za duży) będą wyświetlane jako globalne powiadomienia typu "toast" (komponent `Toast` z shadcn/ui).

**Kluczowe widoki, ekrany i przepływy użytkownika:**
*   **Strona Logowania (`/login`):** Prosty formularz logowania bez topbara.
*   **Strona Listy Podsumowań (`/summaries`):** Tabela z listą podsumowań (sortowanie, filtrowanie), topbar nawigacyjny, przycisk "Nowe podsumowanie" (dodatkowy skrót). Potencjalne błędy ładowania listy wyświetlane inline.
*   **Ekran Tworzenia/Edycji Podsumowania (`/create`, `/edit/:id`):** Formularz do edycji/tworzenia, kontrolka wczytywania pliku, przyciski akcji (Podsumuj, Zapisz, Anuluj), topbar nawigacyjny. Błędy LLM i zapisu wyświetlane inline w obszarze formularza/przycisków akcji. Potwierdzenia zapisu wyświetlane jako toast.
*   **Przepływy użytkownika:** Logowanie -> Lista -> [Nowe] lub [Edytuj] -> Edycja/Tworzenie -> [Zapisz] lub [Anuluj] -> Lista. Nawigacja między chronionymi stronami głównie przez topbar lub kontekstowe przyciski.

**Strategia integracji z API i zarządzania stanem:**
*   Komunikacja z API Supabase dla operacji CRUD na podsumowaniach i endpointem LLM.
*   Zarządzanie stanem za pomocą podstawowych hooków React (`useState`, `useEffect`). Lokalny stan błędu dla komunikatów inline.
*   Globalny system toastów do powiadomień o sukcesie i błędach walidacji.

**Kwestie dotyczące responsywności, dostępności i bezpieczeństwa:**
*   **Responsywność:** Nie jest priorytetem w MVP.
*   **Dostępność:** W pewnym stopniu wspierana przez użycie gotowych komponentów shadcn/ui i semantyczne etykietowanie. Wyświetlanie błędów inline w pobliżu miejsca ich wystąpienia poprawia dostępność dla użytkowników korzystających z czytników ekranu lub nawigujących klawiaturą.
*   **Bezpieczeństwo:** Zapewnione przez Supabase Auth (SDK) i RLS. Frontend egzekwuje uwierzytelnienie i przekierowuje na stronę logowania.

**Nierozwiązane kwestie lub obszary wymagające dalszego wyjaśnienia:**
Wszystkie poprzednio zidentyfikowane kwestie zostały wyjaśnione i podjęto decyzje dotyczące ich implementacji w ramach zakresu MVP, z uwzględnieniem wykorzystania komponentów shadcn/ui, specyfikacji topbara nawigacyjnego oraz zaktualizowanej strategii wyświetlania błędów (inline) i powiadomień (toasts).
</ui_architecture_planning_summary>
<unresolved_issues>
</unresolved_issues>
</conversation_summary>