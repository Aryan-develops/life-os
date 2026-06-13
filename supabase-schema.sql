-- Run this in your Supabase SQL Editor

create table if not exists sleep_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  bedtime text,
  wake_time text,
  sleep_hour numeric,
  wake_hour numeric,
  duration_hr numeric,
  quality integer check (quality between 1 and 10),
  notes text,
  source text default 'manual',
  created_at timestamptz default now()
);

create table if not exists heart_metrics (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  resting_hr numeric,
  hrv numeric,
  vo2max numeric,
  notes text,
  source text default 'manual',
  created_at timestamptz default now()
);

create table if not exists gym_sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type text,
  duration_min integer,
  start_hour numeric,
  exercises jsonb default '[]',
  notes text,
  created_at timestamptz default now()
);

create table if not exists macros (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  calories integer,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  notes text,
  created_at timestamptz default now()
);

create table if not exists stimulants (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null,
  type text default 'supplement',
  dose_mg numeric,
  time_taken text,
  created_at timestamptz default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text default 'short',
  target_date date,
  progress_pct integer default 0,
  status text default 'active',
  notes text,
  business_id uuid,
  created_at timestamptz default now()
);

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists business_finances (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  date date not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  category text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists business_tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  title text not null,
  status text default 'todo',
  priority text default 'medium',
  due_date date,
  created_at timestamptz default now()
);

create table if not exists personal_finances (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  category text,
  notes text,
  created_at timestamptz default now()
);

-- Enable Row Level Security (open for now - add auth later)
alter table sleep_logs enable row level security;
alter table heart_metrics enable row level security;
alter table gym_sessions enable row level security;
alter table macros enable row level security;
alter table stimulants enable row level security;
alter table goals enable row level security;
alter table businesses enable row level security;
alter table business_finances enable row level security;
alter table business_tasks enable row level security;
alter table personal_finances enable row level security;

-- Allow all access for now (you can add auth restrictions later)
create policy "allow_all" on sleep_logs for all using (true) with check (true);
create policy "allow_all" on heart_metrics for all using (true) with check (true);
create policy "allow_all" on gym_sessions for all using (true) with check (true);
create policy "allow_all" on macros for all using (true) with check (true);
create policy "allow_all" on stimulants for all using (true) with check (true);
create policy "allow_all" on goals for all using (true) with check (true);
create policy "allow_all" on businesses for all using (true) with check (true);
create policy "allow_all" on business_finances for all using (true) with check (true);
create policy "allow_all" on business_tasks for all using (true) with check (true);
create policy "allow_all" on personal_finances for all using (true) with check (true);
