
-- Indeks dla szybkiego wyszukiwania podsumowań danego użytkownika
CREATE INDEX IF NOT EXISTS idx_meeting_summaries_user_id 
ON meeting_summaries(user_id);

-- Indeks dla szybkiego sortowania po dacie utworzenia (domyślne sortowanie w API)
CREATE INDEX IF NOT EXISTS idx_meeting_summaries_created_at 
ON meeting_summaries(created_at DESC);

-- Indeks dla szybkiego sortowania po dacie modyfikacji
CREATE INDEX IF NOT EXISTS idx_meeting_summaries_updated_at 
ON meeting_summaries(modified_at DESC);

-- Indeks kompozytowy dla typowego scenariusza: lista podsumowań użytkownika posortowana po dacie
CREATE INDEX IF NOT EXISTS idx_meeting_summaries_user_id_created_at 
ON meeting_summaries(user_id, created_at DESC);
