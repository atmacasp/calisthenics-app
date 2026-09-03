-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  height_cm numeric,
  weight_kg numeric,
  unit_preference text default 'metric' check (unit_preference in ('metric','imperial')),
  level text default 'beginner' check (level in ('beginner','intermediate')),
  theme text default 'system' check (theme in ('system','light','dark')),
  language text default 'tr',
  notifications_enabled boolean default true,
  current_streak int default 0,
  longest_streak int default 0,
  last_workout_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- MOVEMENT GROUPS (7 sabit kategori)
create table public.movement_groups (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  image_url text,
  order_index int default 0
);

-- MOVEMENTS (progression basamakları)
create table public.movements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.movement_groups(id) on delete cascade,
  name text not null,
  description text,
  gif_url text,
  image_url text,
  difficulty_level int check (difficulty_level between 1 and 10),
  order_index int default 0,
  created_at timestamptz default now()
);

-- PROGRAMS
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  level text check (level in ('beginner','intermediate','advanced')),
  is_premium boolean default false,
  created_at timestamptz default now()
);

create table public.program_movements (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade,
  movement_id uuid references public.movements(id) on delete cascade,
  day_of_week int check (day_of_week between 1 and 7),
  target_sets int,
  target_reps int,
  target_duration_seconds int,
  rest_seconds int default 60,
  order_index int default 0
);

create table public.user_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  started_at timestamptz default now(),
  is_active boolean default true
);

-- WORKOUT TRACKING
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  program_id uuid references public.programs(id),
  started_at timestamptz default now(),
  ended_at timestamptz,
  notes text
);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.workout_sessions(id) on delete cascade,
  movement_id uuid references public.movements(id),
  set_number int not null,
  reps int,
  duration_seconds int,
  added_weight_kg numeric,
  completed_at timestamptz default now()
);

-- BODY WEIGHT
create table public.body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  weight_kg numeric not null,
  logged_at date default current_date,
  created_at timestamptz default now()
);

-- AUTO-CREATE PROFILE ON SIGNUP
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ROW LEVEL SECURITY
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

alter table public.movement_groups enable row level security;
create policy "movement_groups_public_read" on public.movement_groups for select using (true);

alter table public.movements enable row level security;
create policy "movements_public_read" on public.movements for select using (true);

alter table public.programs enable row level security;
create policy "programs_public_read" on public.programs for select using (true);

alter table public.program_movements enable row level security;
create policy "program_movements_public_read" on public.program_movements for select using (true);

alter table public.user_programs enable row level security;
create policy "user_programs_own" on public.user_programs for all using (auth.uid() = user_id);

alter table public.workout_sessions enable row level security;
create policy "workout_sessions_own" on public.workout_sessions for all using (auth.uid() = user_id);

alter table public.workout_sets enable row level security;
create policy "workout_sets_own" on public.workout_sets for all using (
  exists (select 1 from public.workout_sessions ws where ws.id = session_id and ws.user_id = auth.uid())
);

alter table public.body_weight_logs enable row level security;
create policy "body_weight_logs_own" on public.body_weight_logs for all using (auth.uid() = user_id);

-- SEED: 7 sabit hareket kategorisi
insert into public.movement_groups (slug, name, order_index) values
('handstand', 'Handstand', 1),
('hspu', 'HSPU', 2),
('l-sit', 'L-Sit', 3),
('muscle-up', 'Muscle Up', 4),
('back-lever', 'Back Lever', 5),
('front-lever', 'Front Lever', 6),
('planche', 'Planche', 7);
