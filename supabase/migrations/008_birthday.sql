-- Migration 008: birthday fields on profiles.
--
-- RLS note: PostgreSQL RLS is row-granular — it cannot hide individual
-- columns from a role. The profiles table stays SELECT-able by
-- anon/authenticated (username availability + community features need it),
-- so birthday visibility is enforced in the application layer via
-- canSeeBirthday() in src/lib/cloud/birthday.ts: the birthday is only
-- exposed for the profile owner or when birthday_public = true.
-- birthday_public defaults to false, so birthdays are hidden everywhere
-- in the UI unless the user opts in. The birthday email job (service_role,
-- bypasses RLS) reads birthday + birthday_email_opt_in directly.

alter table profiles add column if not exists birthday date;
alter table profiles add column if not exists birthday_public boolean not null default false;
alter table profiles add column if not exists birthday_email_opt_in boolean not null default true;

-- Tighten the old broad policy: split anon (signup username check) from
-- authenticated (community profile reads). Functionally equivalent to the
-- previous USING (true) policy, clearer intent.
drop policy if exists "username availability check" on public.profiles;

create policy "username availability check"
on public.profiles for select
to anon
using (true);

create policy "authenticated read profiles"
on public.profiles for select
to authenticated
using (true);

-- Owner keeps full row access via the existing "own profile" policy
-- (ALL ... USING (auth.uid() = id) WITH CHECK (auth.uid() = id)).
