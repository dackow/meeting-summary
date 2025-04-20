-- Header comment:
-- Purpose: Alters the 'meeting_summaries' table to allow NULL values for the 'notes' column.
-- Affected tables/columns:
--   - meeting_summaries (notes)
-- Special considerations:
--   - This change allows the 'notes' field to be optional when inserting or updating records.
--   - Does not affect existing rows unless they contain NULLs (which should not be the case due to prior NOT NULL constraint).

-- Alter the 'meeting_summaries' table to drop the NOT NULL constraint on the 'notes' column
ALTER TABLE public.meeting_summaries ALTER COLUMN notes DROP NOT NULL;

comment on column public.meeting_summaries.notes is 'Notatki użytkownika dla danego podsumowania (opcjonalne)';

-- Note: No RLS policies need to be changed for this modification as RLS is based on user access, not column constraints.
-- Note: Indexes are already defined for other columns and are not affected by this change.
-- Note: Triggers (like update_modified_at) are not affected by this change.