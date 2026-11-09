-- =====================================================================
-- ERP Zinkra — CAIXINHAS (divisão de cada entrada) e COMPRAS
-- Rode no SQL Editor do Supabase. Idempotente: pode rodar de novo.
-- Só ADICIONA tabelas: não apaga nem altera nada que já existe.
-- Pré-requisito: erp-schema.sql (usa profiles, erp_level() e touch_updated_at()).
--
-- Ideia: todo dinheiro que entra (recebimento de projeto ou do SaaS) é dividido em 4 caixinhas
-- pelos percentuais abaixo. A divisão NÃO é copiada: o ERP calcula a partir do recebimento,
-- então nada fica duplicado. Aqui só ficam as REGRAS e o que o Danilo registra à mão.
--
--   caixinhas_config      percentuais (cada linha vale a partir de uma data; o histórico fica)
--   caixinha_repasses     "já movi no banco": 1 linha por recebimento (nunca repete)
--   caixinha_movimentos   retiradas, gastos e ajustes feitos à mão em uma caixinha
--   compras               lista de coisas a comprar (valor estimado, prioridade, status)
--   compras_reservas      quanto de uma caixinha está COMPROMETIDO com cada compra
--
-- Caixinhas: gastar (Danilo, para gastar), guardar (Danilo, para guardar),
--            caixa (Caixa da Zinkra), invest (Investimento da Zinkra).
-- Dinheiro em centavos (bigint). Segurança: mesmo padrão do financeiro (erp_level('financeiro')).
-- =====================================================================

create table if not exists public.caixinhas_config (
  id            uuid primary key default gen_random_uuid(),
  vigente_desde date not null unique,
  pct_gastar    numeric(5,2) not null check (pct_gastar  >= 0),
  pct_guardar   numeric(5,2) not null check (pct_guardar >= 0),
  pct_caixa     numeric(5,2) not null check (pct_caixa   >= 0),
  pct_invest    numeric(5,2) not null check (pct_invest  >= 0),
  notes         text,
  owner_id      uuid default auth.uid() references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint caixinhas_config_soma_ck check (pct_gastar + pct_guardar + pct_caixa + pct_invest = 100)
);

create table if not exists public.caixinha_repasses (
  id           uuid primary key default gen_random_uuid(),
  origem_tipo  text not null check (origem_tipo in ('recebimento','saas')),
  origem_id    uuid not null,
  repassado_em date not null default current_date,
  owner_id     uuid default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint caixinha_repasses_unico unique (origem_tipo, origem_id)
);

create table if not exists public.caixinha_movimentos (
  id           uuid primary key default gen_random_uuid(),
  caixinha     text not null check (caixinha in ('gastar','guardar','caixa','invest')),
  tipo         text not null check (tipo in ('entrada','saida')),
  amount_cents bigint not null check (amount_cents > 0),
  feito_em     date not null default current_date,
  descricao    text,          -- nota livre (entradas e ajustes)
  motivo       text,          -- SAQUE: por que está tirando o dinheiro
  destino      text,          -- SAQUE: o que vai fazer com ele (para olhar daqui a anos)
  grupo        uuid,          -- liga as duas pontas de uma transferência entre caixinhas
  owner_id     uuid default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- todo saque precisa dizer o porquê e para quê: o banco recusa saque sem isso
  constraint caixinha_movimentos_saque_ck check (
    tipo <> 'saida' or (length(btrim(coalesce(motivo, ''))) > 0 and length(btrim(coalesce(destino, ''))) > 0))
);
-- caso a tabela já exista de uma rodada anterior deste arquivo
alter table public.caixinha_movimentos add column if not exists motivo  text;
alter table public.caixinha_movimentos add column if not exists destino text;
create index if not exists caixinha_movimentos_cx_idx on public.caixinha_movimentos (caixinha, feito_em);

create table if not exists public.compras (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  valor_cents   bigint not null check (valor_cents > 0),   -- valor estimado
  link          text,
  prioridade    text not null default 'media' check (prioridade in ('alta','media','baixa')),
  status        text not null default 'desejo' check (status in ('desejo','comprada','descartada')),
  pago_cents    bigint check (pago_cents is null or pago_cents > 0),
  comprada_em   date,
  pago_de       text check (pago_de is null or pago_de in ('caixa','invest')),  -- de onde saiu o que passou do reservado
  notes         text,
  owner_id      uuid default auth.uid() references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint compras_comprada_ck check (status <> 'comprada' or (pago_cents is not null and comprada_em is not null))
);

create table if not exists public.compras_reservas (
  id           uuid primary key default gen_random_uuid(),
  compra_id    uuid not null references public.compras(id) on delete cascade,
  caixinha     text not null default 'invest' check (caixinha in ('caixa','invest')),
  amount_cents bigint not null check (amount_cents > 0),
  owner_id     uuid default auth.uid() references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists compras_reservas_compra_idx on public.compras_reservas (compra_id);

-- divisão inicial escolhida pelo Danilo: 40 / 15 / 25 / 20, valendo só para o que entrar a partir de 09/11/2026
insert into public.caixinhas_config (vigente_desde, pct_gastar, pct_guardar, pct_caixa, pct_invest, notes)
select date '2026-11-09', 40, 15, 25, 20, 'Divisão inicial'
 where not exists (select 1 from public.caixinhas_config);

do $$
declare t text;
begin
  foreach t in array array['caixinhas_config','caixinha_repasses','caixinha_movimentos','compras','compras_reservas']
  loop
    execute format('drop trigger if exists trg_touch on public.%I', t);
    execute format('create trigger trg_touch before update on public.%I for each row execute function public.touch_updated_at()', t);
    -- histórico automático (quem mexeu, quando, antes e depois), se o erp-comandas.sql já foi rodado:
    -- um saque apagado ou alterado continua aparecendo no histórico
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
