alter table public.profiles drop constraint profiles_level_check;
alter table public.profiles add constraint profiles_level_check
  check (level in ('beginner','intermediate','advanced'));
