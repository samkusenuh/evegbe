-- =====================================================================
-- Eʋegbe Community Learning Platform — Database Schema
-- Run this in Supabase SQL Editor after creating a new project.
-- =====================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- PROFILES — one row per registered user, 1:1 with auth.users
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (length(username) >= 3 and length(username) <= 24),
  display_name text,
  is_native_speaker boolean default false not null,
  reputation integer default 0 not null,
  created_at timestamptz default now() not null
);

create index idx_profiles_username on public.profiles(username);
create index idx_profiles_reputation on public.profiles(reputation desc);

-- Auto-create a profile row when a new auth user signs up.
-- Username comes from auth metadata (set during signup).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', null)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- GROUPS — thematic categories for words (Greetings, Family, …)
-- ---------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  display_order integer default 100 not null,
  created_at timestamptz default now() not null
);

create index idx_groups_order on public.groups(display_order);

-- ---------------------------------------------------------------------
-- ENTRIES — Ewe words or short phrases + their English translation
-- ---------------------------------------------------------------------
create type entry_status as enum ('pending', 'approved', 'disputed');
create type entry_type as enum ('word', 'phrase');

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  ewe text not null,
  english text not null,
  notes text,
  entry_type entry_type default 'word' not null,
  group_id uuid references public.groups(id) on delete set null,
  submitted_by uuid references public.profiles(id) on delete set null,
  status entry_status default 'pending' not null,
  approval_score integer default 0 not null,
  rejection_score integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_entries_group on public.entries(group_id);
create index idx_entries_status on public.entries(status);
create index idx_entries_created on public.entries(created_at desc);
create index idx_entries_submitter on public.entries(submitted_by);
-- Fast full-text search on ewe + english
create index idx_entries_search on public.entries
  using gin (to_tsvector('simple', ewe || ' ' || english || ' ' || coalesce(notes, '')));

-- ---------------------------------------------------------------------
-- RECORDINGS — audio pronunciations attached to entries
-- ---------------------------------------------------------------------
create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.entries(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  storage_path text not null, -- e.g. "<user_id>/<recording_id>.webm"
  duration_ms integer,
  approval_score integer default 0 not null,
  rejection_score integer default 0 not null,
  created_at timestamptz default now() not null
);

create index idx_recordings_entry on public.recordings(entry_id);
create index idx_recordings_user on public.recordings(user_id);
create index idx_recordings_score on public.recordings(approval_score desc);

-- ---------------------------------------------------------------------
-- VALIDATIONS — community votes on entries and recordings
-- A user can vote once per target. Native speakers' votes weigh more.
-- ---------------------------------------------------------------------
create type validation_target as enum ('entry', 'recording');
create type validation_verdict as enum ('correct', 'incorrect');

create table public.validations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  target_type validation_target not null,
  target_id uuid not null,
  verdict validation_verdict not null,
  note text,
  weight integer default 1 not null, -- 3 for native speakers, 1 otherwise
  created_at timestamptz default now() not null,
  unique (user_id, target_type, target_id)
);

create index idx_validations_target on public.validations(target_type, target_id);

-- ---------------------------------------------------------------------
-- REPUTATION EVENTS — audit log of reputation point awards
-- ---------------------------------------------------------------------
create table public.reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_type text not null, -- 'submitted_entry', 'entry_approved', 'uploaded_recording', 'validated', etc.
  points integer not null,
  source_id uuid, -- optional reference to entry/recording/validation
  description text,
  created_at timestamptz default now() not null
);

create index idx_reputation_user on public.reputation_events(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- TRIGGERS — automatic scoring + reputation
-- ---------------------------------------------------------------------

-- When a validation is inserted, update the target's score and award points
-- to the validator (small boost for participating).
create or replace function public.handle_validation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_weight integer;
begin
  -- Native speakers get 3x weight on their validations
  select case when is_native_speaker then 3 else 1 end
    into v_weight
    from public.profiles where id = new.user_id;

  update public.validations set weight = v_weight where id = new.id;

  if new.target_type = 'entry' then
    if new.verdict = 'correct' then
      update public.entries
        set approval_score = approval_score + v_weight, updated_at = now()
        where id = new.target_id;
    else
      update public.entries
        set rejection_score = rejection_score + v_weight, updated_at = now()
        where id = new.target_id;
    end if;

    -- Promote to 'approved' once approval_score reaches 5 (e.g., 2 natives or 5 regulars)
    update public.entries
      set status = 'approved'
      where id = new.target_id and status = 'pending' and approval_score >= 5;

    -- Mark 'disputed' if rejection_score outweighs approval by 3
    update public.entries
      set status = 'disputed'
      where id = new.target_id and rejection_score >= approval_score + 3;

  elsif new.target_type = 'recording' then
    if new.verdict = 'correct' then
      update public.recordings
        set approval_score = approval_score + v_weight
        where id = new.target_id;
    else
      update public.recordings
        set rejection_score = rejection_score + v_weight
        where id = new.target_id;
    end if;
  end if;

  -- Award +1 to the validator
  insert into public.reputation_events (user_id, event_type, points, source_id, description)
    values (new.user_id, 'validated', 1, new.id, 'Voted on ' || new.target_type::text);
  update public.profiles set reputation = reputation + 1 where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists on_validation_insert on public.validations;
create trigger on_validation_insert
  after insert on public.validations
  for each row execute function public.handle_validation();

-- When an entry is created, award +2 to the submitter.
create or replace function public.handle_entry_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.submitted_by is not null then
    insert into public.reputation_events (user_id, event_type, points, source_id, description)
      values (new.submitted_by, 'submitted_entry', 2, new.id, 'Submitted: ' || new.ewe);
    update public.profiles set reputation = reputation + 2 where id = new.submitted_by;
  end if;
  return new;
end;
$$;

drop trigger if exists on_entry_insert on public.entries;
create trigger on_entry_insert
  after insert on public.entries
  for each row execute function public.handle_entry_insert();

-- When an entry's status flips to 'approved', award +10 bonus to submitter.
create or replace function public.handle_entry_approved()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'approved' and old.status <> 'approved' and new.submitted_by is not null then
    insert into public.reputation_events (user_id, event_type, points, source_id, description)
      values (new.submitted_by, 'entry_approved', 10, new.id, 'Entry approved: ' || new.ewe);
    update public.profiles set reputation = reputation + 10 where id = new.submitted_by;
  end if;
  return new;
end;
$$;

drop trigger if exists on_entry_status_change on public.entries;
create trigger on_entry_status_change
  after update of status on public.entries
  for each row execute function public.handle_entry_approved();

-- When a recording is uploaded, award +3 to the uploader.
create or replace function public.handle_recording_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.user_id is not null then
    insert into public.reputation_events (user_id, event_type, points, source_id, description)
      values (new.user_id, 'uploaded_recording', 3, new.id, 'Uploaded pronunciation');
    update public.profiles set reputation = reputation + 3 where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_recording_insert on public.recordings;
create trigger on_recording_insert
  after insert on public.recordings
  for each row execute function public.handle_recording_insert();

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.entries enable row level security;
alter table public.recordings enable row level security;
alter table public.validations enable row level security;
alter table public.reputation_events enable row level security;

-- Profiles: everyone can read; users can update their own
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Groups: everyone reads; only authenticated can create (admin UI could restrict more)
create policy "groups_select_all" on public.groups for select using (true);
create policy "groups_insert_auth" on public.groups for insert
  with check (auth.role() = 'authenticated');

-- Entries: everyone reads; authenticated users can insert
create policy "entries_select_all" on public.entries for select using (true);
create policy "entries_insert_auth" on public.entries for insert
  with check (auth.uid() = submitted_by);
-- Submitters can edit own entries while still pending
create policy "entries_update_own_pending" on public.entries for update
  using (auth.uid() = submitted_by and status = 'pending');

-- Recordings: everyone reads; authenticated users can insert their own
create policy "recordings_select_all" on public.recordings for select using (true);
create policy "recordings_insert_own" on public.recordings for insert
  with check (auth.uid() = user_id);
create policy "recordings_delete_own" on public.recordings for delete
  using (auth.uid() = user_id);

-- Validations: readable by all; users can insert their own
create policy "validations_select_all" on public.validations for select using (true);
create policy "validations_insert_own" on public.validations for insert
  with check (auth.uid() = user_id);

-- Reputation events: only own events visible
create policy "reputation_select_own" on public.reputation_events for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- STORAGE BUCKET — audio recordings
-- Run this ONCE in the Supabase SQL editor after schema is applied.
-- Then set the bucket to public via the dashboard (Storage → recordings → make public)
-- or keep private and generate signed URLs.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('recordings', 'recordings', true)
  on conflict (id) do nothing;

-- Storage RLS: anyone can read; authenticated users can upload to their own folder
create policy "recordings_read_all" on storage.objects for select
  using (bucket_id = 'recordings');

create policy "recordings_upload_own" on storage.objects for insert
  with check (
    bucket_id = 'recordings'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "recordings_delete_own" on storage.objects for delete
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
