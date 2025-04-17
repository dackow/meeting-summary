-- Header comment:
-- Purpose: Creates the 'meeting_summaries' table to store meeting transcripts, summaries and metadata.
-- Affected tables/columns:
--   - meeting_summaries (id, user_id, file_name, data_utworzenia, data_modyfikacji, transcription, summary, llm_generated, notes)
-- Special considerations:
--   - RLS policies are configured to ensure users can only access their own data.

-- Create the 'meeting_summaries' table
create table meeting_summaries (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade not null,  -- Poprawne odwołanie do tabeli users
    file_name varchar(255),
    created_at timestamp with time zone default now() not null,
    modified_at timestamp with time zone default now() not null,
    transcription text not null,
    summary text not null, -- Zmieniono varchar(500) na text, aby uniknąć ograniczeń długości
    llm_generated boolean default true not null,
    notes text not null
);

comment on table meeting_summaries is 'tabela zawierająca podsumowania spotkań';
comment on column meeting_summaries.id is 'unikalny id podsumowania spotkania';
comment on column meeting_summaries.user_id is 'id użytkownika, klucz obcy z tabeli users';
comment on column meeting_summaries.file_name is 'nazwa oryginalnego pliku transkrypcji';
comment on column meeting_summaries.created_at is 'znacznik czasu utworzenia podsumowania';
comment on column meeting_summaries.modified_at is 'znacznik czasu ostatniej modyfikacji podsumowania';
comment on column meeting_summaries.transcription is 'oryginalna transkrypcja spotkania';
comment on column meeting_summaries.summary is 'podsumowanie spotkania wygenerowane przez llm';
comment on column meeting_summaries.llm_generated is 'boolean wskazujący, czy podsumowanie zostało wygenerowane przez llm';
comment on column meeting_summaries.notes is 'notatki użytkownika dla danego podsumowania';

-- Enable RLS on the 'meeting_summaries' table
alter table meeting_summaries enable row level security;

-- Create RLS policy for 'meeting_summaries' table - SELECT access for authenticated users
create policy "meeting_summaries_select_policy" on meeting_summaries
for select
to authenticated
using (auth.uid() = user_id);

comment on policy "meeting_summaries_select_policy" on meeting_summaries is 'włącz dostęp do odczytu dla użytkowników na podstawie ich własnego id';

-- Create RLS policy for 'meeting_summaries' table - INSERT access for authenticated users
create policy "meeting_summaries_insert_policy" on meeting_summaries
for insert
to authenticated
with check (auth.uid() = user_id);

comment on policy "meeting_summaries_insert_policy" on meeting_summaries is 'włącz dostęp do wstawiania dla użytkowników na podstawie ich własnego id';

-- Create RLS policy for 'meeting_summaries' table - UPDATE access for authenticated users
create policy "meeting_summaries_update_policy" on meeting_summaries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

comment on policy "meeting_summaries_update_policy" on meeting_summaries is 'włącz dostęp do aktualizacji dla użytkowników na podstawie ich własnego id';

-- Create RLS policy for 'meeting_summaries' table - DELETE access for authenticated users
create policy "meeting_summaries_delete_policy" on meeting_summaries
for delete
to authenticated
using (auth.uid() = user_id);

comment on policy "meeting_summaries_delete_policy" on meeting_summaries is 'włącz dostęp do usuwania dla użytkowników na podstawie ich własnego id';

-- Create indexes to optimize query performance
create index idx_meeting_summaries_user_id on meeting_summaries(user_id);
comment on index idx_meeting_summaries_user_id is 'indeks dla id użytkownika, używany do szybkiego pobierania danych';

create index idx_meeting_summaries_created_at on meeting_summaries(created_at);
comment on index idx_meeting_summaries_created_at is 'indeks dla daty utworzenia podsumowania spotkania, używany do szybkiego pobierania danych';

create index idx_meeting_summaries_llm_generated on meeting_summaries(llm_generated);
comment on index idx_meeting_summaries_llm_generated is 'indeks dla flagi generowania llm, używany do szybkiego pobierania danych';

-- Triggers to automatically update 'modified_at'
CREATE OR REPLACE FUNCTION update_modified_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meeting_summaries_modified_at
BEFORE UPDATE ON meeting_summaries
FOR EACH ROW
EXECUTE FUNCTION update_modified_at();

comment on trigger update_meeting_summaries_modified_at on meeting_summaries is 'trigger to update modified_at timestamp on update';