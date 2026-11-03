-- =====================================================================
-- ERP Zinkra — FINANCEIRO SaaS (produtos próprios da Zinkra, como a Corte)
-- Rode no SQL Editor do Supabase. Idempotente: pode rodar de novo.
-- Só ADICIONA tabelas: não apaga nem altera nada que já existe.
-- Pré-requisito: erp-schema.sql (usa profiles, erp_level() e touch_updated_at()).
--
--   saas_produtos      o produto (ex.: Corte)
--   saas_assinaturas   quem assina e quanto paga POR MÊS (começa em starts_on, termina em ends_on)
--   saas_recebimentos  o dinheiro que entrou de cada produto/assinatura
--
-- Dinheiro em centavos (bigint). Nenhum dado real vem neste arquivo.
-- Segurança: mesmo padrão do financeiro (erp_level('financeiro')).
-- =====================================================================

create table if not exists public.saas_produtos (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  notes      text,
  active     boolean not null default true,
  owner_id   uuid default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saas_assinaturas (
  id           uuid primary key default gen_random_uuid(),
  produto_id   uuid not null references public.saas_produtos(id) on delete restrict,
  customer     text,
  amount_cents bigint not null check (amount_cents > 0),   -- valor por mês
  starts_on    date not null default current_date,
  ends_on      date,
  notes        text,
  owner_id     uuid default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint saas_assinaturas_fim_ck check (ends_on is null or ends_on >= starts_on)
);

create table if not exists public.saas_recebimentos (
  id            uuid primary key default gen_random_uuid(),
  produto_id    uuid not null references public.saas_produtos(id) on delete restrict,
  assinatura_id uuid references public.saas_assinaturas(id) on delete set null,
  amount_cents  bigint not null check (amount_cents > 0),
  received_on   date not null default current_date,
  notes         text,
  owner_id      uuid default auth.uid() references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists saas_assinaturas_produto_idx on public.saas_assinaturas (produto_id);
create index if not exists saas_recebimentos_produto_idx on public.saas_recebimentos (produto_id, received_on);
create index if not exists saas_recebimentos_assin_idx   on public.saas_recebimentos (assinatura_id);

do $$
declare t text;
begin
  foreach t in array array['saas_produtos','saas_assinaturas','saas_recebimentos']
  loop
    execute format('drop trigger if exists trg_touch on public.%I', t);
    execute format('create trigger trg_touch before update on public.%I for each row execute function public.touch_updated_at()', t);
    -- histórico automático, se o erp-comandas.sql já foi rodado
    if to_regprocedure('public.fin_log()') is not null then
      execute format('drop trigger if exists trg_fin_log on public.%I', t);
      execute format('create trigger trg_fin_log after insert or update or delete on public.%I for each row execute function public.fin_log()', t);
    end if;
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
