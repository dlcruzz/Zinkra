-- =====================================================================
-- ERP Zinkra — esquema do banco (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma vez.
-- Depois rode erp-seed.sql para os dados iniciais.
-- Só metadados: texto, números, datas e links. Nenhum arquivo.
-- Valores em centavos (inteiro). Datas em UTC.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Usuários, papéis e permissões
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  email       text,
  role        text not null default 'pendente',  -- diretor | prospector | dev | social | financeiro | pendente
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role    text not null,
  module  text not null,
  level   text not null check (level in ('total','own','read','none')),
  primary key (role, module)
);

-- 2FA no servidor: quem ativou o autenticador só acessa dados com sessão aal2
-- (senha + código). Sem isso, alguém com a senha poderia ler a API direto.
create or replace function public.erp_mfa_ok() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
$$;

-- nível do usuário atual num módulo
create or replace function public.erp_level(p_module text) returns text
language sql stable security definer set search_path = public as $$
  select case when not public.erp_mfa_ok() then 'none' else coalesce(
    (select rp.level
       from public.role_permissions rp
       join public.profiles p on p.role = rp.role
      where p.id = auth.uid() and p.active and rp.module = p_module),
    'none') end
$$;

create or replace function public.erp_is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select public.erp_mfa_ok() and exists (select 1 from public.profiles where id = auth.uid() and active and role <> 'pendente')
$$;

create or replace function public.erp_is_director() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active and role = 'diretor')
$$;

-- cria o perfil ao criar o usuário. O primeiro usuário vira diretor;
-- os demais nascem "pendente" (sem acesso) até o diretor definir o papel.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, name, email, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
          new.email,
          case when first_user then 'diretor' else 'pendente' end)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Configurações gerais
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  key    text primary key,
  value  jsonb not null
);

-- ---------------------------------------------------------------------
-- Comercial
-- ---------------------------------------------------------------------
create table if not exists public.pipelines (
  id      uuid primary key default gen_random_uuid(),
  name    text not null,
  slug    text not null unique,
  sort    int not null default 0,
  active  boolean not null default true
);

create table if not exists public.pipeline_stages (
  id           uuid primary key default gen_random_uuid(),
  pipeline_id  uuid not null references public.pipelines(id) on delete cascade,
  name         text not null,
  sort         int not null default 0,
  probability  int not null default 0,
  kind         text not null default 'open' check (kind in ('open','won','lost','handoff')),
  color        text not null default '#8A938E',
  follow_up_days int  -- automação: dias até o próximo follow-up quando o lead entra nesta etapa
);

create table if not exists public.partners (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  origin      text,
  phone       text,
  pct         numeric not null default 30,
  active      boolean not null default true,
  owner_id    uuid default auth.uid() references public.profiles(id),
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.search_terms (
  id            uuid primary key default gen_random_uuid(),
  niche         text not null,
  neighborhood  text not null,
  done          boolean not null default false,
  done_at       timestamptz,
  owner_id      uuid default auth.uid() references public.profiles(id),
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  archived_at   timestamptz,
  unique (niche, neighborhood)
);

create table if not exists public.leads (
  id                    uuid primary key default gen_random_uuid(),
  company               text not null,
  niche                 text,
  city                  text default 'São Paulo',
  neighborhood          text,
  phone                 text,
  instagram             text,
  website               text,
  has_site              boolean,
  origin                text,
  pipeline_id           uuid references public.pipelines(id),
  stage_id              uuid references public.pipeline_stages(id),
  estimated_value_cents bigint not null default 0,
  estimated_recurring   boolean not null default false,
  next_step             text,
  next_step_at          date,
  next_step_code        text,
  lost_reason           text,
  partner_id            uuid references public.partners(id),
  search_term_id        uuid references public.search_terms(id),
  last_contact_at       timestamptz,
  stage_changed_at      timestamptz not null default now(),
  handed_off_at         timestamptz,
  handed_off_by         uuid references public.profiles(id),
  won_at                timestamptz,
  client_id             uuid,
  notes                 text,
  owner_id              uuid default auth.uid() references public.profiles(id),
  created_by            uuid default auth.uid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  archived_at           timestamptz
);
create index if not exists leads_stage_idx on public.leads(stage_id);
create index if not exists leads_owner_idx on public.leads(owner_id);
alter table public.leads add column if not exists phone_digits text
  generated always as (regexp_replace(coalesce(phone, ''), '\D', '', 'g')) stored;
create index if not exists leads_phone_idx on public.leads(phone_digits);
create index if not exists leads_instagram_idx on public.leads(lower(instagram));

create table if not exists public.contacts (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references public.leads(id) on delete cascade,
  client_id     uuid,
  name          text not null,
  phone         text,
  email         text,
  job_title     text,
  decision_role text default 'decisor' check (decision_role in ('decisor','filtro','influenciador')),
  created_at    timestamptz not null default now()
);

create table if not exists public.activities (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid references public.leads(id) on delete cascade,
  client_id    uuid,
  type         text not null default 'whatsapp' check (type in ('whatsapp','ligacao','email','visita','nota','reuniao','sistema')),
  result       text,          -- enviado | respondeu | sem_resposta | invalido | null
  script_code  text,
  note         text,
  happened_at  timestamptz not null default now(),
  owner_id     uuid default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists activities_lead_idx on public.activities(lead_id, happened_at desc);

create table if not exists public.stage_history (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  from_stage  uuid references public.pipeline_stages(id),
  to_stage    uuid references public.pipeline_stages(id),
  changed_by  uuid default auth.uid(),
  changed_at  timestamptz not null default now()
);

create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id),  -- null = empresa toda
  metric      text not null check (metric in ('contatos','respostas','reunioes','handoffs','propostas','fechamentos','valor_fechado','faturamento')),
  period      text not null default 'month' check (period in ('day','week','month')),
  target      numeric not null,
  repeat      boolean not null default true,
  starts_on   date not null default date_trunc('month', now())::date,
  owner_id    uuid default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  front       text not null default 'sites' check (front in ('sites','sistemas','social','trafego','interno')),
  min_cents   bigint not null default 0,
  max_cents   bigint not null default 0,
  billing     text not null default 'once' check (billing in ('once','monthly')),
  includes    text,
  template_id uuid,
  active      boolean not null default true,
  sort        int not null default 0
);

create table if not exists public.playbooks (
  id           uuid primary key default gen_random_uuid(),
  collection   text not null default 'Prospecção',
  niche        text,
  code         text,
  title        text not null,
  when_to_use  text,
  body         text not null default '',
  active       boolean not null default true,
  owner_id     uuid default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);

-- ---------------------------------------------------------------------
-- Clientes, propostas e contratos
-- ---------------------------------------------------------------------
create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references public.leads(id),
  name          text not null,
  contact_name  text,
  phone         text,
  email         text,
  instagram     text,
  niche         text,
  since         date not null default current_date,
  status        text not null default 'ativo' check (status in ('ativo','pausado','encerrado')),
  partner_id    uuid references public.partners(id),
  notes         text,
  owner_id      uuid default auth.uid() references public.profiles(id),
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  archived_at   timestamptz
);

alter table public.leads drop constraint if exists leads_client_fk;
alter table public.leads add constraint leads_client_fk foreign key (client_id) references public.clients(id);
alter table public.contacts drop constraint if exists contacts_client_fk;
alter table public.contacts add constraint contacts_client_fk foreign key (client_id) references public.clients(id) on delete cascade;
alter table public.activities drop constraint if exists activities_client_fk;
alter table public.activities add constraint activities_client_fk foreign key (client_id) references public.clients(id) on delete cascade;

create sequence if not exists public.proposal_number_seq start 1;

create table if not exists public.proposals (
  id             uuid primary key default gen_random_uuid(),
  number         int not null default nextval('public.proposal_number_seq'),
  lead_id        uuid references public.leads(id),
  client_id      uuid references public.clients(id),
  title          text,
  contact_name   text,
  status         text not null default 'rascunho' check (status in ('rascunho','enviada','vista','aceita','recusada','expirada')),
  valid_until    date,
  discount_pct   numeric not null default 0,
  payment_terms  text,
  installments   int not null default 1,
  first_due_on   date,
  pdf_url        text,
  script_url     text,
  sent_at        timestamptz,
  accepted_at    timestamptz,
  refused_reason text,
  notes          text,
  owner_id       uuid default auth.uid() references public.profiles(id),
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  archived_at    timestamptz
);

create table if not exists public.proposal_items (
  id           uuid primary key default gen_random_uuid(),
  proposal_id  uuid not null references public.proposals(id) on delete cascade,
  service_id   uuid references public.services(id),
  description  text not null,
  includes     text,
  qty          numeric not null default 1,
  unit_cents   bigint not null default 0,
  recurring    boolean not null default false,
  sort         int not null default 0
);

create table if not exists public.contracts (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients(id) on delete cascade,
  proposal_id    uuid references public.proposals(id),
  title          text not null,
  kind           text not null default 'once' check (kind in ('once','recurring')),
  front          text not null default 'sites',
  total_cents    bigint not null default 0,      -- projeto único
  installments   int not null default 1,
  monthly_cents  bigint not null default 0,      -- recorrente
  billing_day    int check (billing_day between 1 and 28),
  starts_on      date not null default current_date,
  ends_on        date,
  link           text,
  active         boolean not null default true,
  partner_id     uuid references public.partners(id),
  owner_id       uuid default auth.uid() references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  archived_at    timestamptz
);

-- ---------------------------------------------------------------------
-- Operação
-- ---------------------------------------------------------------------
create table if not exists public.project_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  front       text not null default 'sites',
  est_hours   numeric,
  duration_days int,
  created_at  timestamptz not null default now()
);

create table if not exists public.template_items (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references public.project_templates(id) on delete cascade,
  kind         text not null default 'task' check (kind in ('task','checklist','milestone')),
  title        text not null,
  offset_days  int not null default 0,
  est_minutes  int,
  sort         int not null default 0
);

alter table public.services drop constraint if exists services_template_fk;
alter table public.services add constraint services_template_fk foreign key (template_id) references public.project_templates(id) on delete set null;

create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references public.clients(id),
  contract_id  uuid references public.contracts(id),
  template_id  uuid references public.project_templates(id),
  name         text not null,
  type         text,
  front        text not null default 'sites',
  stage        text not null default 'briefing' check (stage in ('briefing','design','desenvolvimento','revisao','ajustes','entregue','manutencao')),
  starts_on    date default current_date,
  due_on       date,
  delivered_on date,
  value_cents  bigint not null default 0,
  est_hours    numeric,
  scope        text,
  links        jsonb not null default '[]'::jsonb,   -- [{label, url}]
  notes        text,
  owner_id     uuid default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);

create table if not exists public.project_checklist (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  done        boolean not null default false,
  sort        int not null default 0
);

create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  due_on      date,
  done        boolean not null default false,
  sort        int not null default 0
);

create table if not exists public.meetings (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  type          text not null default 'alinhamento' check (type in ('prospeccao','briefing','alinhamento','entrega','interna')),
  starts_at     timestamptz not null,
  duration_min  int not null default 30,
  location      text,
  participants  text,
  lead_id       uuid references public.leads(id),
  client_id     uuid references public.clients(id),
  project_id    uuid references public.projects(id),
  agenda        text,
  notes         text,
  decisions     text,
  owner_id      uuid default auth.uid() references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  archived_at   timestamptz
);

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  status       text not null default 'todo' check (status in ('todo','doing','review','done')),
  priority     text not null default 'normal' check (priority in ('urgente','alta','normal','baixa')),
  due_on       date,
  front        text default 'interno',
  project_id   uuid references public.projects(id) on delete cascade,
  client_id    uuid references public.clients(id),
  lead_id      uuid references public.leads(id) on delete cascade,
  meeting_id   uuid references public.meetings(id) on delete set null,
  parent_id    uuid references public.tasks(id) on delete cascade,
  recurrence   text not null default 'none' check (recurrence in ('none','daily','weekdays','weekly','monthly')),
  est_minutes  int,
  done_at      timestamptz,
  sort         int not null default 0,
  auto_key     text unique,   -- tarefas criadas por automação não duplicam
  owner_id     uuid default auth.uid() references public.profiles(id),   -- responsável
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);
create index if not exists tasks_owner_idx on public.tasks(owner_id, status);

create table if not exists public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references public.tasks(id) on delete set null,
  project_id  uuid references public.projects(id) on delete set null,
  note        text,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  minutes     int,
  owner_id    uuid default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now()
);

create table if not exists public.meeting_actions (
  id          uuid primary key default gen_random_uuid(),
  meeting_id  uuid not null references public.meetings(id) on delete cascade,
  title       text not null,
  who         text,
  owner_id    uuid references public.profiles(id),
  due_on      date,
  task_id     uuid references public.tasks(id) on delete set null,
  sort        int not null default 0
);

-- ---------------------------------------------------------------------
-- Financeiro
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id    uuid primary key default gen_random_uuid(),
  kind  text not null default 'expense',
  name  text not null,
  sort  int not null default 0,
  unique (kind, name)
);

create table if not exists public.payables (
  id            uuid primary key default gen_random_uuid(),
  description   text not null,
  supplier      text,
  category      text not null default 'Outros',
  front         text not null default 'interno',
  amount_cents  bigint not null,
  due_on        date not null,
  paid_on       date,
  method        text,
  recurrence    text not null default 'once' check (recurrence in ('once','monthly','yearly')),
  series_id     uuid,          -- raiz da série recorrente
  link          text,
  commission_id uuid,
  notes         text,
  owner_id      uuid default auth.uid() references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  archived_at   timestamptz
);
create unique index if not exists payables_series_due_uq on public.payables(series_id, due_on) where series_id is not null;

create table if not exists public.receivables (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references public.clients(id),
  contract_id   uuid references public.contracts(id) on delete cascade,
  description   text not null,
  part_label    text,
  front         text not null default 'sites',
  amount_cents  bigint not null,
  due_on        date not null,
  received_on   date,
  method        text,
  notes         text,
  owner_id      uuid default auth.uid() references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  archived_at   timestamptz
);
create unique index if not exists receivables_contract_due_uq on public.receivables(contract_id, due_on, part_label) where contract_id is not null;

create table if not exists public.commissions (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references public.partners(id),
  client_id     uuid references public.clients(id),
  contract_id   uuid references public.contracts(id) on delete cascade,
  lead_id       uuid references public.leads(id),
  description   text,
  base_cents    bigint not null,
  pct           numeric not null,
  amount_cents  bigint not null,
  status        text not null default 'prevista' check (status in ('prevista','a_pagar','paga','cancelada')),
  payable_id    uuid references public.payables(id) on delete set null,
  owner_id      uuid default auth.uid() references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Empresa
-- ---------------------------------------------------------------------
create table if not exists public.ideas (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  type        text not null default 'produto' check (type in ('produto','conteudo','melhoria','nicho','ferramenta')),
  status      text not null default 'nova' check (status in ('nova','avaliando','aprovada','virou','descartada')),
  impact      int check (impact between 1 and 5),
  effort      int check (effort between 1 and 5),
  note        text,
  outcome     text,
  project_id  uuid references public.projects(id) on delete set null,
  task_id     uuid references public.tasks(id) on delete set null,
  owner_id    uuid default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.insight_dismissals (
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  key        text not null,
  until      date not null,
  primary key (user_id, key)
);

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   uuid,
  action      text not null,
  summary     text,
  changes     jsonb,
  actor       uuid default auth.uid(),
  at          timestamptz not null default now()
);
create index if not exists audit_at_idx on public.audit_log(at desc);

-- ---------------------------------------------------------------------
-- Triggers: updated_at
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['partners','search_terms','leads','playbooks','clients','proposals','contracts',
                           'projects','meetings','tasks','payables','receivables','commissions','ideas']
  loop
    execute format('drop trigger if exists trg_touch on public.%I', t);
    execute format('create trigger trg_touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Triggers: auditoria
-- ---------------------------------------------------------------------
create or replace function public.erp_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  diff jsonb := '{}'::jsonb;
  k text;
  rid uuid;
  label text;
begin
  if tg_op = 'DELETE' then
    rid := old.id;
    label := coalesce(to_jsonb(old)->>'title', to_jsonb(old)->>'name', to_jsonb(old)->>'company', to_jsonb(old)->>'description');
  else
    rid := new.id;
    label := coalesce(to_jsonb(new)->>'title', to_jsonb(new)->>'name', to_jsonb(new)->>'company', to_jsonb(new)->>'description');
  end if;
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(to_jsonb(new)) loop
      if k not in ('updated_at') and (to_jsonb(new)->k) is distinct from (to_jsonb(old)->k) then
        diff := diff || jsonb_build_object(k, jsonb_build_array(to_jsonb(old)->k, to_jsonb(new)->k));
      end if;
    end loop;
    if diff = '{}'::jsonb then return new; end if;
  end if;
  insert into public.audit_log (table_name, record_id, action, summary, changes)
  values (tg_table_name, rid, lower(tg_op), label, case when tg_op = 'UPDATE' then diff else null end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['leads','clients','proposals','contracts','projects','tasks','payables','receivables',
                           'commissions','goals','profiles','meetings']
  loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.erp_audit()', t);
  end loop;
end $$;

-- role_permissions não tem coluna id: auditoria própria
create or replace function public.erp_audit_perm() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (table_name, action, summary)
  values ('role_permissions', lower(tg_op),
          coalesce(new.role, old.role) || ' · ' || coalesce(new.module, old.module) || ' → ' || coalesce(new.level, '-'));
  return coalesce(new, old);
end $$;
drop trigger if exists trg_audit on public.role_permissions;
create trigger trg_audit after insert or update or delete on public.role_permissions
  for each row execute function public.erp_audit_perm();

-- ---------------------------------------------------------------------
-- Automações no banco
-- ---------------------------------------------------------------------

-- Lead: histórico de etapa, datas e follow-up automático da etapa
create or replace function public.erp_lead_stage() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  st public.pipeline_stages%rowtype;
begin
  if tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id then
    new.stage_changed_at := now();
    select * into st from public.pipeline_stages where id = new.stage_id;
    if found then
      if st.kind = 'won' and new.won_at is null then new.won_at := now(); end if;
      if st.kind = 'handoff' and new.handed_off_at is null then
        new.handed_off_at := now();
        new.handed_off_by := coalesce(new.handed_off_by, auth.uid());
      end if;
      if st.follow_up_days is not null and st.kind = 'open' then
        new.next_step_at := (current_date + st.follow_up_days);
      end if;
    end if;
    if tg_op = 'UPDATE' then
      insert into public.stage_history (lead_id, from_stage, to_stage) values (new.id, old.stage_id, new.stage_id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_lead_stage on public.leads;
create trigger trg_lead_stage before insert or update of stage_id on public.leads
  for each row execute function public.erp_lead_stage();

create or replace function public.erp_lead_stage_first() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.stage_history (lead_id, from_stage, to_stage) values (new.id, null, new.stage_id);
  return new;
end $$;
drop trigger if exists trg_lead_stage_first on public.leads;
create trigger trg_lead_stage_first after insert on public.leads
  for each row execute function public.erp_lead_stage_first();

-- Lead passado ao diretor: cria a tarefa de conduzir a proposta para o diretor
create or replace function public.erp_lead_handoff() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  k text;
  dir uuid;
begin
  select kind into k from public.pipeline_stages where id = new.stage_id;
  if k = 'handoff' and (tg_op = 'INSERT' or old.stage_id is distinct from new.stage_id) then
    select id into dir from public.profiles where role = 'diretor' and active order by created_at limit 1;
    if dir is not null then
      insert into public.tasks (title, priority, front, due_on, lead_id, owner_id, created_by, auto_key)
      values ('Conduzir proposta: ' || new.company, 'alta', 'comercial', current_date + 1, new.id, dir, auth.uid(),
              'handoff:' || new.id)
      on conflict (auto_key) do nothing;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_lead_handoff on public.leads;
create trigger trg_lead_handoff after insert or update of stage_id on public.leads
  for each row execute function public.erp_lead_handoff();

-- Atividade registrada: atualiza último contato do lead
create or replace function public.erp_activity_touch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.lead_id is not null and new.type <> 'sistema' then
    update public.leads set last_contact_at = greatest(coalesce(last_contact_at, new.happened_at), new.happened_at)
     where id = new.lead_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_activity_touch on public.activities;
create trigger trg_activity_touch after insert on public.activities
  for each row execute function public.erp_activity_touch();

-- Termo de busca concluído
create or replace function public.erp_term_done() returns trigger
language plpgsql as $$
begin
  if new.done and (old.done is distinct from true) then new.done_at := now(); end if;
  if not new.done then new.done_at := null; end if;
  return new;
end $$;
drop trigger if exists trg_term_done on public.search_terms;
create trigger trg_term_done before update of done on public.search_terms
  for each row execute function public.erp_term_done();

-- Tarefa recorrente: ao concluir, cria a próxima ocorrência sozinha
create or replace function public.erp_task_recur() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  nxt date;
  base date;
begin
  if new.status = 'done' and old.status <> 'done' then
    new.done_at := now();
    if new.recurrence <> 'none' then
      base := coalesce(new.due_on, current_date);
      nxt := case new.recurrence
               when 'daily'    then base + 1
               when 'weekdays' then base + case extract(isodow from base)::int when 5 then 3 when 6 then 2 else 1 end
               when 'weekly'   then base + 7
               when 'monthly'  then (base + interval '1 month')::date
             end;
      insert into public.tasks (title, description, priority, due_on, front, project_id, client_id, lead_id,
                                recurrence, est_minutes, owner_id, created_by)
      values (new.title, new.description, new.priority, nxt, new.front, new.project_id, new.client_id, new.lead_id,
              new.recurrence, new.est_minutes, new.owner_id, new.created_by);
      new.recurrence := 'none';  -- a série continua na tarefa nova
    end if;
  elsif new.status <> 'done' and old.status = 'done' then
    new.done_at := null;
  end if;
  return new;
end $$;
drop trigger if exists trg_task_recur on public.tasks;
create trigger trg_task_recur before update of status on public.tasks
  for each row execute function public.erp_task_recur();

-- Cronômetro: minutos calculados ao parar
create or replace function public.erp_time_minutes() returns trigger
language plpgsql as $$
begin
  if new.ended_at is not null then
    new.minutes := greatest(1, round(extract(epoch from (new.ended_at - new.started_at)) / 60)::int);
  end if;
  return new;
end $$;
drop trigger if exists trg_time_minutes on public.time_entries;
create trigger trg_time_minutes before insert or update on public.time_entries
  for each row execute function public.erp_time_minutes();

-- Recebimento confirmado: libera comissão do parceiro (vira conta a pagar)
create or replace function public.erp_receivable_received() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c public.commissions%rowtype;
  pay_id uuid;
  pname text;
begin
  if new.received_on is not null and old.received_on is null and new.contract_id is not null then
    for c in select * from public.commissions where contract_id = new.contract_id and status = 'prevista' loop
      select name into pname from public.partners where id = c.partner_id;
      insert into public.payables (description, supplier, category, front, amount_cents, due_on, commission_id, owner_id)
      values ('Comissão · ' || coalesce(c.description, 'indicação'), pname, 'Comissões', new.front,
              c.amount_cents, current_date + 5, c.id, c.owner_id)
      returning id into pay_id;
      update public.commissions set status = 'a_pagar', payable_id = pay_id where id = c.id;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists trg_receivable_received on public.receivables;
create trigger trg_receivable_received after update of received_on on public.receivables
  for each row execute function public.erp_receivable_received();

-- Conta de comissão paga: marca a comissão como paga
create or replace function public.erp_payable_paid() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.paid_on is not null and old.paid_on is null and new.commission_id is not null then
    update public.commissions set status = 'paga' where id = new.commission_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_payable_paid on public.payables;
create trigger trg_payable_paid after update of paid_on on public.payables
  for each row execute function public.erp_payable_paid();

-- Despesa recorrente nova vira raiz da própria série
create or replace function public.erp_payable_series() returns trigger
language plpgsql as $$
begin
  if new.recurrence <> 'once' and new.series_id is null then
    new.series_id := new.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_payable_series on public.payables;
create trigger trg_payable_series before insert on public.payables
  for each row execute function public.erp_payable_series();

-- Gera mensalidades de contratos recorrentes e despesas recorrentes
-- até o fim do mês seguinte. Idempotente: pode rodar quantas vezes quiser.
create or replace function public.erp_generate_recurring() returns int
language plpgsql security definer set search_path = public as $$
declare
  horizon date := (date_trunc('month', current_date) + interval '2 month' - interval '1 day')::date;
  c record;
  p record;
  d date;
  n int := 0;
  step interval;
begin
  if not public.erp_is_member() then return 0; end if;

  -- contratos recorrentes
  for c in select * from public.contracts
            where kind = 'recurring' and active and archived_at is null and monthly_cents > 0 loop
    d := make_date(extract(year from c.starts_on)::int, extract(month from c.starts_on)::int,
                   coalesce(c.billing_day, least(extract(day from c.starts_on)::int, 28)));
    if d < c.starts_on then d := (d + interval '1 month')::date; end if;
    while d <= horizon and (c.ends_on is null or d <= c.ends_on) loop
      if d >= date_trunc('month', current_date)::date - interval '1 month' then
        insert into public.receivables (client_id, contract_id, description, part_label, front, amount_cents, due_on, owner_id)
        values (c.client_id, c.id, c.title, to_char(d, 'MM/YYYY'), c.front, c.monthly_cents, d, c.owner_id)
        on conflict do nothing;
        if found then n := n + 1; end if;
      end if;
      d := (d + interval '1 month')::date;
    end loop;
  end loop;

  -- despesas recorrentes (a raiz é a primeira ocorrência)
  for p in select * from public.payables
            where recurrence <> 'once' and id = series_id and archived_at is null loop
    step := case p.recurrence when 'monthly' then interval '1 month' else interval '1 year' end;
    d := (p.due_on + step)::date;
    while d <= horizon loop
      insert into public.payables (description, supplier, category, front, amount_cents, due_on, recurrence,
                                   series_id, link, owner_id)
      values (p.description, p.supplier, p.category, p.front, p.amount_cents, d, p.recurrence, p.series_id, p.link, p.owner_id)
      on conflict do nothing;
      if found then n := n + 1; end if;
      d := (d + step)::date;
    end loop;
  end loop;

  return n;
end $$;

-- ---------------------------------------------------------------------
-- Segurança (RLS)
-- ---------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.role_permissions   enable row level security;
alter table public.settings           enable row level security;
alter table public.pipelines          enable row level security;
alter table public.pipeline_stages    enable row level security;
alter table public.partners           enable row level security;
alter table public.search_terms       enable row level security;
alter table public.leads              enable row level security;
alter table public.contacts           enable row level security;
alter table public.activities         enable row level security;
alter table public.stage_history      enable row level security;
alter table public.goals              enable row level security;
alter table public.services           enable row level security;
alter table public.playbooks          enable row level security;
alter table public.clients            enable row level security;
alter table public.proposals          enable row level security;
alter table public.proposal_items     enable row level security;
alter table public.contracts          enable row level security;
alter table public.project_templates  enable row level security;
alter table public.template_items     enable row level security;
alter table public.projects           enable row level security;
alter table public.project_checklist  enable row level security;
alter table public.milestones         enable row level security;
alter table public.meetings           enable row level security;
alter table public.tasks              enable row level security;
alter table public.time_entries       enable row level security;
alter table public.meeting_actions    enable row level security;
alter table public.categories         enable row level security;
alter table public.payables           enable row level security;
alter table public.receivables        enable row level security;
alter table public.commissions        enable row level security;
alter table public.ideas              enable row level security;
alter table public.insight_dismissals enable row level security;
alter table public.audit_log          enable row level security;

-- remove políticas antigas para poder rodar o arquivo de novo
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- perfis
create policy profiles_select on public.profiles for select using (public.erp_is_member() or id = auth.uid());
create policy profiles_update_self on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy profiles_director on public.profiles for all using (public.erp_level('config') = 'total')
  with check (public.erp_level('config') = 'total');

-- tabelas de configuração: todos os membros leem, só config=total escreve
do $$
declare t text;
begin
  foreach t in array array['role_permissions','settings','pipelines','pipeline_stages','services','categories',
                           'project_templates','template_items']
  loop
    execute format('create policy %I on public.%I for select using (public.erp_is_member())', t || '_read', t);
    execute format('create policy %I on public.%I for all using (public.erp_level(''config'') = ''total'') with check (public.erp_level(''config'') = ''total'')', t || '_write', t);
  end loop;
end $$;

-- tabelas com dono (owner_id) e módulo
do $$
declare
  r record;
begin
  for r in select * from (values
      ('partners','parceiros'), ('search_terms','prospeccao'), ('playbooks','playbooks'),
      ('clients','clientes'), ('proposals','propostas'), ('contracts','clientes'),
      ('projects','projetos'), ('meetings','reunioes'), ('tasks','tarefas'),
      ('payables','financeiro'), ('receivables','financeiro'), ('commissions','financeiro'),
      ('activities','crm'), ('time_entries','tarefas')
    ) as x(tbl, module)
  loop
    execute format($f$create policy %I on public.%I for select using (
        public.erp_level(%L) in ('total','read') or (public.erp_level(%L) = 'own' and owner_id = auth.uid()))$f$,
        r.tbl || '_select', r.tbl, r.module, r.module);
    execute format($f$create policy %I on public.%I for insert with check (
        public.erp_level(%L) = 'total' or (public.erp_level(%L) = 'own' and owner_id = auth.uid()))$f$,
        r.tbl || '_insert', r.tbl, r.module, r.module);
    execute format($f$create policy %I on public.%I for update using (
        public.erp_level(%L) = 'total' or (public.erp_level(%L) = 'own' and owner_id = auth.uid()))
        with check (public.erp_level(%L) = 'total' or (public.erp_level(%L) = 'own' and owner_id = auth.uid()))$f$,
        r.tbl || '_update', r.tbl, r.module, r.module, r.module, r.module);
    execute format($f$create policy %I on public.%I for delete using (public.erp_level(%L) = 'total')$f$,
        r.tbl || '_delete', r.tbl, r.module);
  end loop;
end $$;

-- parceiros também visíveis para quem vê o CRM (para escolher o indicador)
create policy partners_select_crm on public.partners for select using (public.erp_level('crm') <> 'none');
-- playbooks e termos de busca: qualquer membro com acesso lê
create policy playbooks_read_any on public.playbooks for select using (public.erp_level('playbooks') <> 'none' or public.erp_level('prospeccao') <> 'none');
create policy terms_read_any on public.search_terms for select using (public.erp_level('prospeccao') <> 'none');
create policy terms_update_any on public.search_terms for update using (public.erp_level('prospeccao') in ('total','own'))
  with check (public.erp_level('prospeccao') in ('total','own'));
-- tarefas: o responsável vê e atualiza; quem criou também vê
create policy tasks_select_creator on public.tasks for select using (created_by = auth.uid());

-- leads: "own" vê os seus e os sem dono, e pode assumir um lead sem dono
create policy leads_select on public.leads for select using (
  public.erp_level('crm') in ('total','read')
  or (public.erp_level('crm') = 'own' and (owner_id = auth.uid() or owner_id is null)));
create policy leads_insert on public.leads for insert with check (
  public.erp_level('crm') = 'total' or (public.erp_level('crm') = 'own' and owner_id = auth.uid()));
create policy leads_update on public.leads for update using (
  public.erp_level('crm') = 'total'
  or (public.erp_level('crm') = 'own' and (owner_id = auth.uid() or owner_id is null)))
  with check (public.erp_level('crm') = 'total' or (public.erp_level('crm') = 'own' and owner_id = auth.uid()));
create policy leads_delete on public.leads for delete using (public.erp_level('crm') = 'total');

-- metas: cada um vê as suas e as da empresa; só quem tem metas=total define
create policy goals_select on public.goals for select using (
  public.erp_level('metas') in ('total','read') or user_id = auth.uid() or user_id is null);
create policy goals_write on public.goals for all using (public.erp_level('metas') = 'total')
  with check (public.erp_level('metas') = 'total');

-- tabelas filhas: seguem a visibilidade do registro pai
create policy contacts_all on public.contacts for all using (
  (lead_id is not null and exists (select 1 from public.leads l where l.id = lead_id))
  or (client_id is not null and exists (select 1 from public.clients c where c.id = client_id)))
  with check (
  (lead_id is not null and exists (select 1 from public.leads l where l.id = lead_id))
  or (client_id is not null and exists (select 1 from public.clients c where c.id = client_id)));
create policy stage_history_select on public.stage_history for select using (exists (select 1 from public.leads l where l.id = lead_id));
create policy proposal_items_all on public.proposal_items for all
  using (exists (select 1 from public.proposals p where p.id = proposal_id))
  with check (exists (select 1 from public.proposals p where p.id = proposal_id));
create policy checklist_all on public.project_checklist for all
  using (exists (select 1 from public.projects p where p.id = project_id))
  with check (exists (select 1 from public.projects p where p.id = project_id));
create policy milestones_all on public.milestones for all
  using (exists (select 1 from public.projects p where p.id = project_id))
  with check (exists (select 1 from public.projects p where p.id = project_id));
create policy meeting_actions_all on public.meeting_actions for all
  using (exists (select 1 from public.meetings m where m.id = meeting_id))
  with check (exists (select 1 from public.meetings m where m.id = meeting_id));

-- ideias: todo membro com acesso cria e vê; quem tem total edita tudo; autor edita a sua
create policy ideas_select on public.ideas for select using (public.erp_level('ideias') <> 'none');
create policy ideas_insert on public.ideas for insert with check (public.erp_level('ideias') <> 'none' and owner_id = auth.uid());
create policy ideas_update on public.ideas for update using (public.erp_level('ideias') = 'total' or owner_id = auth.uid())
  with check (public.erp_level('ideias') = 'total' or owner_id = auth.uid());
create policy ideas_delete on public.ideas for delete using (public.erp_level('ideias') = 'total');

-- sugestões dispensadas: cada um as suas
create policy dismissals_own on public.insight_dismissals for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- auditoria: só leitura, para quem tem config
create policy audit_select on public.audit_log for select using (public.erp_level('config') in ('total','read'));

-- ---------------------------------------------------------------------
-- Permissões padrão por papel
-- ---------------------------------------------------------------------
insert into public.role_permissions (role, module, level) values
  -- diretor: tudo
  ('diretor','dashboard','total'),('diretor','crm','total'),('diretor','prospeccao','total'),('diretor','metas','total'),
  ('diretor','propostas','total'),('diretor','clientes','total'),('diretor','projetos','total'),('diretor','tarefas','total'),
  ('diretor','reunioes','total'),('diretor','financeiro','total'),('diretor','parceiros','total'),('diretor','ideias','total'),
  ('diretor','playbooks','total'),('diretor','relatorios','total'),('diretor','config','total'),
  -- prospector
  ('prospector','dashboard','none'),('prospector','crm','own'),('prospector','prospeccao','own'),('prospector','metas','read'),
  ('prospector','propostas','read'),('prospector','clientes','read'),('prospector','projetos','none'),('prospector','tarefas','own'),
  ('prospector','reunioes','own'),('prospector','financeiro','none'),('prospector','parceiros','none'),('prospector','ideias','own'),
  ('prospector','playbooks','read'),('prospector','relatorios','none'),('prospector','config','none'),
  -- dev
  ('dev','dashboard','none'),('dev','crm','read'),('dev','prospeccao','none'),('dev','metas','none'),
  ('dev','propostas','none'),('dev','clientes','read'),('dev','projetos','own'),('dev','tarefas','own'),
  ('dev','reunioes','own'),('dev','financeiro','none'),('dev','parceiros','none'),('dev','ideias','own'),
  ('dev','playbooks','read'),('dev','relatorios','none'),('dev','config','none'),
  -- social media
  ('social','dashboard','none'),('social','crm','read'),('social','prospeccao','none'),('social','metas','none'),
  ('social','propostas','none'),('social','clientes','read'),('social','projetos','own'),('social','tarefas','own'),
  ('social','reunioes','own'),('social','financeiro','none'),('social','parceiros','none'),('social','ideias','own'),
  ('social','playbooks','read'),('social','relatorios','none'),('social','config','none'),
  -- financeiro
  ('financeiro','dashboard','read'),('financeiro','crm','none'),('financeiro','prospeccao','none'),('financeiro','metas','none'),
  ('financeiro','propostas','read'),('financeiro','clientes','total'),('financeiro','projetos','none'),('financeiro','tarefas','own'),
  ('financeiro','reunioes','none'),('financeiro','financeiro','total'),('financeiro','parceiros','total'),('financeiro','ideias','own'),
  ('financeiro','playbooks','none'),('financeiro','relatorios','read'),('financeiro','config','none')
on conflict (role, module) do nothing;

-- ---------------------------------------------------------------------
-- Acesso pela API: só usuários logados (o RLS acima decide o que cada um vê)
-- ---------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
revoke all on all tables in schema public from anon;
revoke execute on function public.erp_generate_recurring() from anon, public;
