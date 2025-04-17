-- Header comment:
-- Purpose: Creates the 'users' table to store user information.
-- Affected tables/columns:
--   - users (id, email, created_at)
-- Special considerations:
--   - The 'id' column is managed by Supabase Auth.
--   - RLS policies are configured to ensure data access control.

-- Create the 'users' table
create table users (
    id uuid primary key references auth.users(id) on delete cascade,  -- Link to auth.users table!
    email varchar(255) unique not null,
    created_at timestamp with time zone default now()
);

comment on table users is 'table containing user information';
comment on column users.id is 'user id from supabase auth';
comment on column users.email is 'user email address';
comment on column users.created_at is 'timestamp of user creation';

-- Enable RLS on the 'users' table
alter table users enable row level security;

-- Create RLS policy for 'users' table - SELECT access for authenticated users
create policy "users_select_policy" on users
on users
for select
to authenticated  -- THIS IS CORRECT but redundant; the `using` clause implicitly requires authentication
using (auth.uid() = id);

comment on policy "users_select_policy" on users is 'Enable read access to users based on their own user id (authenticated users only)';

-- Create RLS policy for INSERT
CREATE POLICY "users_insert_policy" ON users
FOR INSERT
WITH CHECK (auth.uid() = id AND email = auth.jwt() ->> 'email');

comment on policy "users_insert_policy" on users is 'Allow users to insert their own user record on signup.';

-- Create RLS policy for UPDATE
CREATE POLICY "users_update_policy" ON users
ON users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND email = auth.jwt() ->> 'email');

comment on policy "users_update_policy" on users is 'Allow users to update their own user record.';

-- Create RLS policy for DELETE (optional, but often required for GDPR compliance)
CREATE POLICY "users_delete_policy" ON users
ON users
FOR DELETE
USING (auth.uid() = id);

comment on policy "users_delete_policy" on users is 'Allow users to delete their own user record.';