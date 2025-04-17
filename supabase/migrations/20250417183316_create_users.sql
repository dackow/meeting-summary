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

-- Poprawione polityki RLS (usunięto nadmiarowe 'on users')
-- SELECT policy
create policy "users_select_policy" on users
for select
using (auth.uid() = id);

comment on policy "users_select_policy" on users is 'Enable read access to users based on their own user id (authenticated users only)';

-- INSERT policy
CREATE POLICY "users_insert_policy" ON users
FOR INSERT
WITH CHECK (auth.uid() = id AND email = auth.jwt() ->> 'email');

comment on policy "users_insert_policy" on users is 'Allow users to insert their own user record on signup.';

-- UPDATE policy
CREATE POLICY "users_update_policy" ON users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND email = auth.jwt() ->> 'email');

comment on policy "users_update_policy" on users is 'Allow users to update their own user record.';

-- DELETE policy
CREATE POLICY "users_delete_policy" ON users
FOR DELETE
USING (auth.uid() = id);

comment on policy "users_delete_policy" on users is 'Allow users to delete their own user record.';
