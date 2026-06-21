-- SafariCharge Parametric Sizing Engine — database tables
-- All tables use `sizing_` prefix to avoid collision with existing tables
-- Run: supabase db push

-- Projects table: tracks named sizing projects per user
create table if not exists sizing_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  client_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Project inputs: stores the SimulationInputs snapshot for each project
create table if not exists sizing_project_inputs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references sizing_projects(id) on delete cascade,
  inputs jsonb not null,
  created_at timestamptz default now()
);

-- Project results: stores the SimulationResults snapshot for each project
create table if not exists sizing_project_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references sizing_projects(id) on delete cascade,
  results jsonb not null,
  created_at timestamptz default now()
);

-- Simulation logs: lightweight audit trail of all simulation runs
create table if not exists sizing_simulation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  project_id uuid references sizing_projects(id) on delete set null,
  location_id text,
  solar_kwp numeric,
  battery_kwh numeric,
  inverter_kw numeric,
  total_capex_ksh numeric,
  total_capex_usd numeric,
  simple_payback_years numeric,
  irr_percent numeric,
  npv_usd numeric,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists sizing_projects_user_id_idx on sizing_projects(user_id);
create index if not exists sizing_project_inputs_project_id_idx on sizing_project_inputs(project_id);
create index if not exists sizing_project_results_project_id_idx on sizing_project_results(project_id);
create index if not exists sizing_simulation_logs_user_id_idx on sizing_simulation_logs(user_id);

-- RLS
alter table sizing_projects enable row level security;
alter table sizing_project_inputs enable row level security;
alter table sizing_project_results enable row level security;
alter table sizing_simulation_logs enable row level security;

-- Policies: users can only access their own data
create policy "Users can manage their sizing projects"
  on sizing_projects for all
  using (auth.uid() = user_id);

create policy "Users can manage their project inputs"
  on sizing_project_inputs for all
  using (
    exists (
      select 1 from sizing_projects
      where sizing_projects.id = sizing_project_inputs.project_id
        and sizing_projects.user_id = auth.uid()
    )
  );

create policy "Users can manage their project results"
  on sizing_project_results for all
  using (
    exists (
      select 1 from sizing_projects
      where sizing_projects.id = sizing_project_results.project_id
        and sizing_projects.user_id = auth.uid()
    )
  );

create policy "Users can view their simulation logs"
  on sizing_simulation_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert simulation logs"
  on sizing_simulation_logs for insert
  with check (auth.uid() = user_id);
