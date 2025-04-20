-- Header comment:
-- Purpose: Adds the 'title' column to the 'meeting_summaries' table.
-- Affected tables/columns:
--   - meeting_summaries (title)
-- Special considerations:
--   - The title is derived from the file_name initially, but can be edited.
--   - We add it as nullable first, populate from file_name, then set NOT NULL.

-- Add the 'title' column as nullable TEXT
ALTER TABLE public.meeting_summaries
ADD COLUMN title TEXT NULL;

comment on column public.meeting_summaries.title is 'User-editable title for the meeting summary, defaults from file name.';

-- Populate the new 'title' column for existing rows
-- Extract base name from file_name (removing path and extension)
-- Use COALESCE to handle null file_name, defaulting to a placeholder or empty string
UPDATE public.meeting_summaries
SET title = COALESCE(
    -- Use regexp_replace to remove path and extension
    regexp_replace(file_name, '^(.*/)?([^/.]+)(\..*)?$', '\2'),
    -- Fallback if file_name is NULL
    'Meeting Summary' -- Default title if file_name is NULL
);

-- Ensure the title is not null after populating existing rows
ALTER TABLE public.meeting_summaries
ALTER COLUMN title SET NOT NULL;

-- (Optional but recommended) Add an index if sorting/filtering by title is expected frequently
-- CREATE INDEX IF NOT EXISTS idx_meeting_summaries_title ON meeting_summaries(title);

-- Note: No RLS policies need to be changed for this modification as RLS is based on user access, not column constraints.
-- Note: Other indexes and triggers (like update_modified_at) are not affected by this change.