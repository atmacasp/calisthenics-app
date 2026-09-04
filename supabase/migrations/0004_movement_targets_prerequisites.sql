-- Foundation kategori (temel güç hareketleri) - progression zincirlerinin dışında, ön koşul olarak kullanılır
insert into public.movement_groups (slug, name, description, order_index) values
('foundation', 'Temel Güç', 'Progression''lara başlamadan önce sahip olman gereken temel itme, çekme ve core hareketleri.', 0);

-- movements: hareket tipi ve hedef kriteri alanları
alter table public.movements add column movement_type text not null default 'progression' check (movement_type in ('progression','foundation'));
alter table public.movements add column target_type text check (target_type in ('reps_sets','duration'));
alter table public.movements add column target_sets int;
alter table public.movements add column target_reps int;
alter table public.movements add column target_duration_seconds int;
alter table public.movements add column target_note text;

-- Ön koşul ilişkisi: bir progression basamağı birden çok temel harekete bağlanabilir, her ilişkinin kendi hedefi olabilir
create table public.movement_prerequisites (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid references public.movements(id) on delete cascade not null,
  prerequisite_movement_id uuid references public.movements(id) on delete cascade not null,
  target_sets int,
  target_reps int,
  target_duration_seconds int,
  order_index int default 0,
  unique (movement_id, prerequisite_movement_id)
);

alter table public.movement_prerequisites enable row level security;
create policy "movement_prerequisites_public_read" on public.movement_prerequisites for select using (true);
