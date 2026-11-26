-- 在 Supabase SQL Editor 执行一次。包含账号隔离和原子版本检查。
begin;
create table if not exists public.meal_ledgers (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload ? 'version' and payload->>'version' = '1' and octet_length(payload::text) <= 5000000),
 revision bigint not null check (revision > 0),
 updated_at timestamptz not null default now()
);
alter table public.meal_ledgers enable row level security;
revoke all on public.meal_ledgers from anon, authenticated;
grant select, insert, update on public.meal_ledgers to authenticated;
drop policy if exists meal_select_own on public.meal_ledgers;
create policy meal_select_own on public.meal_ledgers for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists meal_insert_own on public.meal_ledgers;
create policy meal_insert_own on public.meal_ledgers for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists meal_update_own on public.meal_ledgers;
create policy meal_update_own on public.meal_ledgers for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create or replace function public.save_meal_ledger(input_payload jsonb, expected_revision bigint, expected_owner uuid)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare current_owner uuid := auth.uid(); next_revision bigint;
begin
 if current_owner is null then raise exception 'Login required' using errcode='28000'; end if;
 if expected_owner is distinct from current_owner then raise exception 'Account changed' using errcode='28000'; end if;
 if expected_revision is null or expected_revision < 0 or expected_revision >= 9007199254740990 then raise exception 'Invalid revision'; end if;
 if input_payload is null or jsonb_typeof(input_payload) <> 'object' or input_payload->>'version' is distinct from '1' then raise exception 'Invalid payload'; end if;
 if expected_revision = 0 then
  insert into public.meal_ledgers(owner_id,payload,revision) values(current_owner,input_payload,1)
  on conflict(owner_id) do nothing returning revision into next_revision;
 else
  update public.meal_ledgers set payload=input_payload, revision=revision+1, updated_at=now()
  where owner_id=current_owner and revision=expected_revision returning revision into next_revision;
 end if;
 if next_revision is null then raise exception 'Revision conflict' using errcode='40001'; end if;
 return next_revision;
end;
$$;
revoke all on function public.save_meal_ledger(jsonb,bigint,uuid) from public, anon;
grant execute on function public.save_meal_ledger(jsonb,bigint,uuid) to authenticated;
commit;
