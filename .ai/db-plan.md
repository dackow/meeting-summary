## Schemat Bazy Danych PostgreSQL dla Aplikacji Meeting Summarizer

Niniejszy dokument opisuje schemat bazy danych PostgreSQL dla aplikacji Meeting Summarizer, uwzględniając wymagania z dokumentu PRD, notatek z sesji planowania oraz wybranego stacku technologicznego (Supabase).

### 1. Tabele

#### 1.1. Tabela `users`

*   **Opis:** Przechowuje informacje o użytkownikach aplikacji. Klucz główny pochodzi z Supabase Auth.
*   **Kolumny:**
    *   `id` UUID PRIMARY KEY (pochodzący z Supabase Auth)
    *   `email` VARCHAR(255) UNIQUE NOT NULL
    *   `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

#### 1.2. Tabela `meeting_summaries`

*   **Opis:** Przechowuje transkrypcje spotkań, podsumowania generowane przez LLM, notatki użytkowników oraz metadane.
*   **Kolumny:**
    *   `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
    *   `user_id` UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL
    *   `file_name` VARCHAR(255)
    *   `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    *   `modified_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    *   `transcription` TEXT NOT NULL
    *   `summary` VARCHAR(500) NOT NULL
    *   `llm_generated` BOOLEAN DEFAULT TRUE NOT NULL
    *   `notes` TEXT NOT NULL

### 2. Relacje

*   **users 1:N meeting_summaries:** Jeden użytkownik może mieć wiele transkrypcji i podsumowań.  Relacja ta jest zdefiniowana przez klucz obcy `user_id` w tabeli `meeting_summaries`, który odwołuje się do `id` w tabeli `users`.  `ON DELETE CASCADE` zapewnia, że usunięcie użytkownika spowoduje usunięcie wszystkich jego powiązanych transkrypcji i podsumowań.

### 3. Indeksy

*   `idx_meeting_summaries_user_id` ON `meeting_summaries(user_id)`: Przyspiesza wyszukiwanie podsumowań danego użytkownika.
*   `idx_meeting_summaries_data_utworzenia` ON `meeting_summaries(data_utworzenia)`: Przyspiesza sortowanie podsumowań po dacie utworzenia.
*   `idx_meeting_summaries_llm_generated` ON `meeting_summaries(llm_generated)`:  Umożliwia szybkie wyszukiwanie podsumowań wygenerowanych przez LLM lub zmodyfikowanych przez użytkownika.

### 4. Zasady PostgreSQL (Row Level Security - RLS)

Poniższe przykłady zasad RLS zapewniają, że użytkownicy mogą manipulować tylko swoimi własnymi danymi. Te zasady są przykładowe i mogą wymagać dostosowania do konkretnych potrzeb aplikacji. Zakładają użycie funkcji `auth.uid()` z Supabase Auth, która zwraca identyfikator zalogowanego użytkownika.

*   **RLS na tabeli `meeting_summaries`:**

    *   `CREATE POLICY select_meeting_summaries ON meeting_summaries FOR SELECT USING (user_id = auth.uid());`
    *   `CREATE POLICY insert_meeting_summaries ON meeting_summaries FOR INSERT WITH CHECK (user_id = auth.uid());`
    *   `CREATE POLICY update_meeting_summaries ON meeting_summaries FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());`
    *   `CREATE POLICY delete_meeting_summaries ON meeting_summaries FOR DELETE USING (user_id = auth.uid());`

### 5. Dodatkowe Uwagi

*   **Supabase Auth:**  Kluczowe jest prawidłowe skonfigurowanie Supabase Auth i zintegrowanie go z aplikacją, aby zapewnić bezpieczne uwierzytelnianie i autoryzację użytkowników.
*   **Typy danych:** Wybór typów danych został dokonany w oparciu o wymagania MVP. W przyszłości, w zależności od potrzeb, można rozważyć ich zmianę (np. użycie `TEXT` zamiast `VARCHAR(500)` dla podsumowań, jeśli okaże się, że 500 znaków to za mało).
*   **Nazewnictwo:**  Użyto konwencji snake_case dla nazw tabel i kolumn.
*   **Normalizacja:** Schemat został znormalizowany do poziomu 3NF, aby uniknąć redundancji danych i zapewnić integralność.
*   **Bezpieczeństwo:**  RLS jest kluczowym elementem bezpieczeństwa, zapewniającym, że użytkownicy mają dostęp tylko do swoich danych. Należy dokładnie przetestować i zweryfikować zasady RLS, aby upewnić się, że działają poprawnie.
*   **Skalowalność:**  Indeksy zostały dodane w celu poprawy wydajności zapytań. W przyszłości, w przypadku bardzo dużych zbiorów danych, można rozważyć partycjonowanie tabeli `meeting_summaries`.

Ten schemat bazy danych stanowi solidną podstawę dla MVP aplikacji Meeting Summarizer. W miarę rozwoju projektu i wdrażania nowych funkcjonalności, schemat może wymagać modyfikacji i rozbudowy.
