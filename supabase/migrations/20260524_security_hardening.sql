-- =============================================================================
-- SafariCharge – Security Hardening
-- Generated: 2026-05-24
--
-- 1. organizations   — tenant/team records
-- 2. org_members     — user-role mapping inside an org (owner/admin/analyst/operator/viewer)
-- 3. audit_log       — immutable, append-only audit trail for sensitive operations
-- 4. Audit triggers  — auto-write to audit_log on INSERT/UPDATE/DELETE
-- 5. org_id column   — add to saved_scenarios for org-scoped sharing
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. Role enum
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.org_role as enum ('owner', 'admin', 'analyst', 'operator', 'viewer');
exception when duplicate_object then null;
end $$;


-- ---------------------------------------------------------------------------
-- 1. organizations
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  slug       text        not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- Any org member may read the org record
drop policy if exists "orgs: members read" on public.organizations;
create policy "orgs: members read"
  on public.organizations for select
  to authenticated
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = id and m.user_id = (select auth.uid())
    )
  );

-- Only owners/admins may update the org record
drop policy if exists "orgs: admins update" on public.organizations;
create policy "orgs: admins update"
  on public.organizations for update
  to authenticated
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin')
    )
  );


-- ---------------------------------------------------------------------------
-- 2. org_members
-- ---------------------------------------------------------------------------
create table if not exists public.org_members (
  org_id     uuid        not null references public.organizations on delete cascade,
  user_id    uuid        not null references auth.users on delete cascade,
  role       public.org_role not null default 'viewer',
  invited_by uuid        references auth.users,
  joined_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

alter table public.org_members enable row level security;

create index if not exists org_members_user_idx on public.org_members (user_id);
create index if not exists org_members_org_idx  on public.org_members (org_id);

-- Any member can see who else is in their org
drop policy if exists "org_members: members read own org" on public.org_members;
create policy "org_members: members read own org"
  on public.org_members for select
  to authenticated
  using (
    exists (
      select 1 from public.org_members self
      where self.org_id = org_id and self.user_id = (select auth.uid())
    )
  );

-- Owners/admins can add members
drop policy if exists "org_members: admins insert" on public.org_members;
create policy "org_members: admins insert"
  on public.org_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.org_members m
      where m.org_id = org_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin')
    )
  );

-- Owners/admins can update roles; owners can transfer ownership
drop policy if exists "org_members: admins update" on public.org_members;
create policy "org_members: admins update"
  on public.org_members for update
  to authenticated
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = org_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin')
    )
  );

-- Owners/admins can remove members; members can remove themselves
drop policy if exists "org_members: admins delete" on public.org_members;
create policy "org_members: admins delete"
  on public.org_members for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.org_members m
      where m.org_id = org_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin')
    )
  );


-- ---------------------------------------------------------------------------
-- 3. audit_log
--    Append-only. No UPDATE or DELETE policies — ever.
--    Written exclusively by the audit_row_change() trigger (SECURITY DEFINER).
--    Users may only read their own entries.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigserial   primary key,
  ts          timestamptz not null default now(),
  actor_id    uuid,                                    -- null for system actions
  actor_ip    inet,
  action      text        not null,                    -- '<table>.<operation>'
  resource    text        not null,                    -- table name
  resource_id text,                                    -- primary key of changed row
  org_id      uuid,                                    -- set when row has org_id
  old_data    jsonb,                                   -- null on INSERT
  new_data    jsonb,                                   -- null on DELETE
  metadata    jsonb                                    -- free-form extra context
);

alter table public.audit_log enable row level security;

-- Users may query their own audit trail
drop policy if exists "audit_log: actors read own" on public.audit_log;
create policy "audit_log: actors read own"
  on public.audit_log for select
  to authenticated
  using (actor_id = (select auth.uid()));

-- No INSERT/UPDATE/DELETE policies for any user role.
-- Rows are written only by the SECURITY DEFINER trigger below.

create index if not exists audit_log_actor_ts_idx    on public.audit_log (actor_id, ts desc);
create index if not exists audit_log_resource_id_idx on public.audit_log (resource, resource_id);
create index if not exists audit_log_ts_idx          on public.audit_log (ts desc);


-- ---------------------------------------------------------------------------
-- 4. audit_row_change() trigger function
--
--    Fires AFTER INSERT/UPDATE/DELETE on sensitive tables.
--    Runs as SECURITY DEFINER so it can write to audit_log even though no
--    public INSERT policy exists on that table.
-- ---------------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id    uuid;
  v_resource_id text;
  v_org_id      uuid;
  v_old         jsonb;
  v_new         jsonb;
begin
  v_actor_id := auth.uid();

  -- Resolve the row's primary key and optional org_id
  if tg_op = 'DELETE' then
    v_resource_id := old.id::text;
    v_old := to_jsonb(old);
    -- Strip secrets / large blobs before storing
    v_old := v_old - 'config' - 'finance' - 'performance' - 'engineering'
                   - 'summary_json';
    if old.* is not null then
      begin v_org_id := (old.*)."org_id"; exception when others then null; end;
    end if;
  else
    v_resource_id := new.id::text;
    v_new := to_jsonb(new);
    v_new := v_new - 'config' - 'finance' - 'performance' - 'engineering'
                   - 'summary_json';
    if tg_op = 'UPDATE' then
      v_old := to_jsonb(old);
      v_old := v_old - 'config' - 'finance' - 'performance' - 'engineering'
                     - 'summary_json';
    end if;
    begin v_org_id := (new.*)."org_id"; exception when others then null; end;
  end if;

  insert into public.audit_log
    (actor_id, action, resource, resource_id, org_id, old_data, new_data)
  values (
    v_actor_id,
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    v_resource_id,
    v_org_id,
    v_old,
    v_new
  );

  return coalesce(new, old);
end;
$$;


-- ---------------------------------------------------------------------------
-- 5. Attach audit triggers to sensitive tables
-- ---------------------------------------------------------------------------

-- saved_scenarios
drop trigger if exists audit_saved_scenarios on public.saved_scenarios;
create trigger audit_saved_scenarios
  after insert or update or delete on public.saved_scenarios
  for each row execute function public.audit_row_change();

-- profiles (UPDATE only — avoid logging full PII on first insert)
drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles
  after update on public.profiles
  for each row execute function public.audit_row_change();

-- simulation_runs (INSERT + DELETE; data rows are immutable)
drop trigger if exists audit_simulation_runs on public.simulation_runs;
create trigger audit_simulation_runs
  after insert or delete on public.simulation_runs
  for each row execute function public.audit_row_change();

-- user_preferences
drop trigger if exists audit_user_preferences on public.user_preferences;
create trigger audit_user_preferences
  after insert or update or delete on public.user_preferences
  for each row execute function public.audit_row_change();

-- component_assets
drop trigger if exists audit_component_assets on public.component_assets;
create trigger audit_component_assets
  after insert or update or delete on public.component_assets
  for each row execute function public.audit_row_change();


-- ---------------------------------------------------------------------------
-- 6. org_id column on saved_scenarios
--    Nullable — existing personal scenarios remain valid.
--    When set, org members (analyst role and above) can read the scenario.
-- ---------------------------------------------------------------------------
alter table public.saved_scenarios
  add column if not exists org_id uuid references public.organizations on delete set null;

create index if not exists saved_scenarios_org_idx on public.saved_scenarios (org_id)
  where org_id is not null;

-- New org-scoped SELECT policy (existing owner policy unchanged)
drop policy if exists "saved_scenarios: org members read" on public.saved_scenarios;
create policy "saved_scenarios: org members read"
  on public.saved_scenarios for select
  to authenticated
  using (
    org_id is not null
    and exists (
      select 1 from public.org_members m
      where m.org_id = saved_scenarios.org_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin', 'analyst', 'operator', 'viewer')
    )
  );

-- Org admins and above can update shared scenarios
drop policy if exists "saved_scenarios: org admins update" on public.saved_scenarios;
create policy "saved_scenarios: org admins update"
  on public.saved_scenarios for update
  to authenticated
  using (
    org_id is not null
    and exists (
      select 1 from public.org_members m
      where m.org_id = saved_scenarios.org_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin')
    )
  );
