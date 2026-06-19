create table if not exists public.schedule_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  players jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  schedule_version text,
  last_sync bigint,
  updated_at timestamptz not null default now()
);

alter table public.schedule_app_state enable row level security;

drop policy if exists "Users can read own schedule state" on public.schedule_app_state;
create policy "Users can read own schedule state"
  on public.schedule_app_state
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own schedule state" on public.schedule_app_state;
create policy "Users can insert own schedule state"
  on public.schedule_app_state
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own schedule state" on public.schedule_app_state;
create policy "Users can update own schedule state"
  on public.schedule_app_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_schedule_app_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_schedule_app_state_updated_at on public.schedule_app_state;
create trigger set_schedule_app_state_updated_at
  before update on public.schedule_app_state
  for each row
  execute function public.set_schedule_app_state_updated_at();
