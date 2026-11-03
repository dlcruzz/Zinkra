-- =====================================================================
-- ERP Zinkra — FINANCEIRO DOS PROJETOS (valores, recebimentos, comissão)
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente:
-- pode rodar de novo sem duplicar nada e sem apagar dados.
--
-- Pré-requisito: supabase/erp-schema.sql já rodado (usa projects, partners,
-- erp_level(), erp_mfa_ok() e touch_updated_at()).
--
-- Reaproveita a tabela projects. Cria só o que faltava:
--   project_valores            itens de valor (base, adicional, melhoria)
--   project_recebimentos       o que o cliente pagou
--   project_comissao           parceiro + tipo (fixa | percentual) + valor
--   project_comissao_pagamentos  o que já foi pago ao parceiro
--   project_comissao_abatimentos o que foi descontado do que se deve ao parceiro
--
-- OS SALDOS NÃO FICAM NO BANCO. Valor total, falta receber, comissão a pagar e
-- lucro previsto são calculados num único lugar do código
-- (erp-app/src/erp/lib/financeiro.js), com testes automatizados. Assim não
-- existem duas contas diferentes.
--
-- Dinheiro em centavos (bigint). Nenhum dado real vem neste arquivo.
-- =====================================================================

create table if not exists public.project_valores (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  kind         text not null default 'base' check (kind in ('base','adicional','melhoria')),
  description  text,
  amount_cents bigint not null check (amount_cents > 0),
  on_date      date not null default current_date,
  owner_id     uuid default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.project_recebimentos (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  received_on  date not null default current_date,
  method       text,
  notes        text,
  bank_tx_id   uuid,        -- ligação com o lançamento do banco (erp-banco.sql)
  owner_id     uuid default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- um parceiro com comissão por projeto
create table if not exists public.project_comissao (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null unique references public.projects(id) on delete cascade,
  partner_id   uuid references public.partners(id) on delete set null,
  partner_name text not null,
  kind         text not null default 'fixa' check (kind in ('fixa','percentual')),
  amount_cents bigint not null default 0 check (amount_cents >= 0),   -- usado quando kind = fixa
  pct          numeric not null default 0 check (pct >= 0 and pct <= 100), -- usado quando kind = percentual
  owner_id     uuid default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.project_comissao_pagamentos (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  paid_on      date not null default current_date,
  notes        text,
  bank_tx_id   uuid,
  owner_id     uuid default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.project_comissao_abatimentos (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  on_date      date not null default current_date,
  reason       text not null,
  owner_id     uuid default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists project_valores_proj_idx       on public.project_valores (project_id);
create index if not exists project_recebimentos_proj_idx  on public.project_recebimentos (project_id, received_on);
create index if not exists project_comissao_pagtos_idx    on public.project_comissao_pagamentos (project_id, paid_on);
create index if not exists project_comissao_abat_idx      on public.project_comissao_abatimentos (project_id);
create index if not exists project_recebimentos_tx_idx    on public.project_recebimentos (bank_tx_id) where bank_tx_id is not null;
create index if not exists project_comissao_pagtos_tx_idx on public.project_comissao_pagamentos (bank_tx_id) where bank_tx_id is not null;

-- ---------------------------------------------------------------------
-- Segurança: mesmo padrão do módulo Financeiro (erp_level('financeiro')):
--   total/read lê tudo; own (ex.: Sócio) lê e grava só o que é dele;
--   só total apaga. Sem acesso para o papel anon.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['project_valores','project_recebimentos','project_comissao',
                           'project_comissao_pagamentos','project_comissao_abatimentos']
  loop
    execute format('drop trigger if exists trg_touch on public.%I', t);
    execute format('create trigger trg_touch before update on public.%I for each row execute function public.touch_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format($f$create policy %I on public.%I for select using (
        (select public.erp_level('financeiro')) in ('total','read')
        or ((select public.erp_level('financeiro')) = 'own' and owner_id = (select auth.uid())))$f$, t || '_select', t);
    execute format($f$create policy %I on public.%I for insert with check (
        (select public.erp_level('financeiro')) = 'total'
        or ((select public.erp_level('financeiro')) = 'own' and owner_id = (select auth.uid())))$f$, t || '_insert', t);
    execute format($f$create policy %I on public.%I for update using (
        (select public.erp_level('financeiro')) = 'total'
        or ((select public.erp_level('financeiro')) = 'own' and owner_id = (select auth.uid())))
        with check ((select public.erp_level('financeiro')) = 'total'
        or ((select public.erp_level('financeiro')) = 'own' and owner_id = (select auth.uid())))$f$, t || '_update', t);
    execute format($f$create policy %I on public.%I for delete using (
        (select public.erp_level('financeiro')) = 'total')$f$, t || '_delete', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
