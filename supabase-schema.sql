-- Run this in Supabase SQL Editor

-- User profiles
create table if not exists user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_weight_kg float,
  current_body_fat_pct float,
  height_cm float,
  age int,
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active')),
  updated_at timestamptz default now()
);

-- Goals
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  type text check (type in ('weight', 'body_fat', 'strength', 'endurance', 'custom')),
  target_value float,
  target_unit text,
  target_date date,
  progress_score float default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Logs
create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  raw_text text not null,
  parsed_food jsonb,
  parsed_workout jsonb,
  parsed_symptoms jsonb,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Body check-ins
create table if not exists body_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  weight_kg float not null,
  body_fat_pct float,
  notes text,
  checked_at date default current_date
);

-- Consult sessions
create table if not exists consult_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  summary text,
  nutritionist_advice text,
  trainer_advice text,
  consultant_advice text,
  logs_covered_from timestamptz,
  logs_covered_to timestamptz,
  consulted_at timestamptz default now()
);

-- Reminders
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text check (type in ('body_checkin', 'workout', 'meal', 'custom')),
  message text not null,
  due_date date,
  is_dismissed boolean default false
);

-- RLS policies
alter table user_profile enable row level security;
alter table goals enable row level security;
alter table logs enable row level security;
alter table body_checkins enable row level security;
alter table consult_sessions enable row level security;
alter table reminders enable row level security;

create policy "Users can manage own profile" on user_profile for all using (auth.uid() = user_id);
create policy "Users can manage own goals" on goals for all using (auth.uid() = user_id);
create policy "Users can manage own logs" on logs for all using (auth.uid() = user_id);
create policy "Users can manage own checkins" on body_checkins for all using (auth.uid() = user_id);
create policy "Users can manage own consults" on consult_sessions for all using (auth.uid() = user_id);
create policy "Users can manage own reminders" on reminders for all using (auth.uid() = user_id);
