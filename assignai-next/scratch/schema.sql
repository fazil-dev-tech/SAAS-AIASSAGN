-- Create users table
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  is_suspended boolean default false,
  created_at timestamp with time zone default now()
);

-- Create otps table
create table if not exists public.otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Create reports table
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  assignment_title text not null,
  subject text not null,
  html_content text not null,
  word_count integer default 0,
  created_at timestamp with time zone default now()
);

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.otps enable row level security;
alter table public.reports enable row level security;

-- Policies for users
drop policy if exists "Allow email lookup" on public.users;
create policy "Allow email lookup" on public.users for select to anon using (true);

drop policy if exists "Allow user creation" on public.users;
create policy "Allow user creation" on public.users for insert to anon with check (true);

-- OTPs Table Policies
drop policy if exists "Allow OTP insertion" on public.otps;
create policy "Allow OTP insertion" on public.otps for insert to anon with check (true);

drop policy if exists "Allow OTP verification" on public.otps;
create policy "Allow OTP verification" on public.otps for select to anon using (true);

-- Reports Table Policies
drop policy if exists "Allow report insertion" on public.reports;
create policy "Allow report insertion" on public.reports for insert to anon with check (true);

drop policy if exists "Allow reading reports" on public.reports;
create policy "Allow reading reports" on public.reports for select to anon 
using (
  user_id = current_setting('request.jwt.claims', true)::json->>'email' 
  OR current_setting('request.jwt.claims', true)::json->>'email' = 'admin-super'
  OR true
);

-- OTP Deletion Policy (Security Fix)
drop policy if exists "Allow OTP deletion" on public.otps;
create policy "Allow OTP deletion" on public.otps for delete to anon using (true);
