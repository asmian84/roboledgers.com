-- Create profiles table (if it doesn't exist)
create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  approval_status text default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Enable RLS on profiles (Public schema mod is allowed)
alter table public.profiles enable row level security;

-- Create policies (Drop first to avoid conflicts if re-running)
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Trigger for new users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, approval_status)
  values (new.id, new.email, 'pending');
  return new;
end;
$$;

-- Safely recreate trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
