-- =====================================================================
-- ERP Zinkra — CARTÃO DE CRÉDITO NO PROJETO e BASE DA COMISSÃO
-- Rode no SQL Editor do Supabase. Idempotente: pode rodar de novo.
-- Só ADICIONA: não apaga nem altera valor, recebimento ou comissão que já existem.
-- Pré-requisitos: erp-financeiro-projetos.sql (e, se já rodou, erp-comandas.sql).
--
-- Ideia: o projeto continua FATURADO pelo valor cheio (ex.: R$ 3.200). O que o cliente paga
-- no cartão tem taxa da maquininha, então cai menos na conta (ex.: R$ 3.099). A taxa é custo.
-- A comissão do parceiro pode ser calculada sobre o que CAIU (líquido) ou sobre o valor cheio.
-- A separação do dinheiro (caixinhas) usa só o que caiu, menos a comissão.
--
--   project_cartao        1 linha por projeto: parcelas, taxa total (%) e, se só parte foi
--                         no cartão, o valor passado no cartão
--   project_comissao.base 'liquido' (depois da taxa do cartão) ou 'bruto' (valor cheio)
--
-- Os valores NÃO são guardados prontos: taxa, líquido e comissão são calculados no código
-- (erp-app/src/erp/lib/financeiro.js), com testes automatizados.
-- Dinheiro em centavos (bigint).
-- =====================================================================

create table if not exists public.project_cartao (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null unique references public.projects(id) on delete cascade,
  parcelas     int  not null default 1 check (parcelas between 1 and 24),
  taxa_pct     numeric(7,4) not null default 0 check (taxa_pct >= 0 and taxa_pct < 100),  -- taxa TOTAL cobrada nessas parcelas
  base_cents   bigint check (base_cents is null or base_cents > 0),                       -- vazio = o projeto inteiro foi no cartão
  owner_id     uuid default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.project_comissao add column if not exists base text not null default 'liquido';
alter table public.project_comissao drop constraint if exists project_comissao_base_check;
alter table public.project_comissao add  constraint project_comissao_base_check check (base in ('liquido','bruto'));

do $$
declare t text := 'project_cartao';
begin
  execute format('drop trigger if exists trg_touch on public.%I', t);
  execute format('create trigger trg_touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  -- histórico automático (quem mexeu, quando, antes e depois), se o erp-comandas.sql já foi rodado
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
end $$;

notify pgrst, 'reload schema';
