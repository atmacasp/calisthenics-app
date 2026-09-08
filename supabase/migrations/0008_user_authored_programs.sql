-- 0008: Kullanıcının kendi programını oluşturması
-- programs.user_id null  -> sistem (hazır) programı, herkese açık
-- programs.user_id dolu  -> o kullanıcının kendi programı, sadece ona görünür

alter table public.programs
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists programs_user_id_idx on public.programs(user_id);

-- Bir program silindiğinde geçmiş antrenmanlar silinmesin, sadece program bağı
-- kopsun. (Eskiden bu FK'de on delete kuralı yoktu; program silme hata veriyordu.)
alter table public.workout_sessions
  drop constraint if exists workout_sessions_program_id_fkey;
alter table public.workout_sessions
  add constraint workout_sessions_program_id_fkey
  foreign key (program_id) references public.programs(id) on delete set null;

-- RLS: okuma sistem + kendi programları, yazma sadece kendi programları
drop policy if exists "programs_public_read" on public.programs;
drop policy if exists "programs_read" on public.programs;
drop policy if exists "programs_insert_own" on public.programs;
drop policy if exists "programs_update_own" on public.programs;
drop policy if exists "programs_delete_own" on public.programs;

create policy "programs_read" on public.programs
  for select using (user_id is null or user_id = auth.uid());
create policy "programs_insert_own" on public.programs
  for insert with check (user_id = auth.uid());
create policy "programs_update_own" on public.programs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "programs_delete_own" on public.programs
  for delete using (user_id = auth.uid());

drop policy if exists "program_movements_public_read" on public.program_movements;
drop policy if exists "program_movements_read" on public.program_movements;
drop policy if exists "program_movements_write_own" on public.program_movements;

create policy "program_movements_read" on public.program_movements
  for select using (
    exists (
      select 1 from public.programs p
      where p.id = program_id and (p.user_id is null or p.user_id = auth.uid())
    )
  );
create policy "program_movements_write_own" on public.program_movements
  for all using (
    exists (select 1 from public.programs p where p.id = program_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.programs p where p.id = program_id and p.user_id = auth.uid())
  );
