-- =====================================================================
-- ERP Zinkra — módulo PESSOAL (finanças pessoais do dono)
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente:
-- pode rodar de novo sem duplicar nada e sem apagar dados.
--
-- Pré-requisito: supabase/erp-schema.sql já rodado (usa touch_updated_at()
-- e erp_mfa_ok()).
--
-- ISOLAMENTO: todas as tabelas começam com pf_. As políticas valem SÓ para
-- o dono: owner_id = (select auth.uid()) E a linha existir em pf_dono.
-- Não há ramo "total", nem erp_level, nem acesso para o papel anon. O
-- diretor comum, o sócio, o financeiro e o dev não enxergam nada daqui.
--
-- Nenhum valor real (saldo, salário, conta, dívida) fica neste arquivo:
-- os dados entram só pela interface. Valores em centavos (inteiro).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Quem é o dono
-- ---------------------------------------------------------------------
create table if not exists public.pf_dono (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- só pode existir UMA linha nesta tabela
create unique index if not exists pf_dono_unica on public.pf_dono ((true));

-- ---------------------------------------------------------------------
-- >>> PASSO MANUAL (rode UMA vez, depois deste arquivo) <<<
--
-- O sistema não sabe qual é o seu usuário e eu não inventei nenhum uid.
-- 1) No Supabase: Authentication → Users → copie o "User UID" do SEU login.
-- 2) Troque SEU_UID_AQUI abaixo pelo uid copiado (mantenha as aspas),
--    tire os dois traços do começo da linha e rode só essa linha:
--
-- insert into public.pf_dono (user_id) values ('SEU_UID_AQUI') on conflict do nothing;
--
-- Para conferir depois: select public.pf_sou_dono();  (deve dar true quando
-- logado como você — no SQL Editor o auth.uid() é nulo, então teste pelo ERP).
-- Para trocar de dono: delete from public.pf_dono; e insira o novo uid.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 2. Função usada pelo menu e pelas rotas do ERP
--    (também exige 2FA, igual ao resto do ERP, quando o usuário tem 2FA)
-- ---------------------------------------------------------------------
create or replace function public.pf_sou_dono() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pf_dono d where d.user_id = (select auth.uid()))
     and public.erp_mfa_ok()
$$;

revoke all on function public.pf_sou_dono() from public, anon;
grant execute on function public.pf_sou_dono() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Tabelas (todas com id, owner_id, created_at, updated_at)
-- ---------------------------------------------------------------------

-- configuração (uma linha por dono)
create table if not exists public.pf_config (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  colchao_cent        bigint not null default 0 check (colchao_cent >= 0),        -- valor mínimo que nunca quer tocar
  reserva_pct         numeric(5,2) not null default 0 check (reserva_pct between 0 and 100),
  meta_reserva_cent   bigint not null default 0 check (meta_reserva_cent >= 0),
  horizonte           text not null default 'segunda_entrada' check (horizonte in ('proxima_entrada','segunda_entrada')),
  acumular_sobra_dia  boolean not null default false,
  regra_fim_semana    text not null default 'antecipar' check (regra_fim_semana in ('antecipar','proximo_dia_util','manter')),
  comprometimento_max_pct numeric(5,2) not null default 50 check (comprometimento_max_pct between 0 and 100),
  onboarding_passo    smallint not null default 1,                                 -- passo do assistente (1 a 4)
  onboarding_ok_em    timestamptz,                                                  -- quando terminou os primeiros passos
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (owner_id)
);

-- carteiras: conta corrente, dinheiro em mãos, cartão de crédito
create table if not exists public.pf_contas (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome                text not null,
  tipo                text not null check (tipo in ('corrente','dinheiro','cartao')),
  saldo_inicial_cent  bigint not null default 0,
  data_saldo_inicial  date,
  fechamento_dia      smallint check (fechamento_dia between 1 and 31),   -- só cartão
  vencimento_dia      smallint check (vencimento_dia between 1 and 31),   -- só cartão
  limite_cent         bigint check (limite_cent >= 0),                    -- só cartão
  ativo               boolean not null default true,
  ordem               integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.pf_categorias (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome        text not null,
  tipo        text not null check (tipo in ('entrada','saida')),
  cor         text not null default '#8A938E',
  essencial   boolean not null default false,
  ativo       boolean not null default true,
  ordem       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- recorrências de entrada (dia 15, dia 30…). Dia 30 em mês sem dia 30 = último dia do mês.
create table if not exists public.pf_recebimentos_modelo (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null default auth.uid() references auth.users(id) on delete cascade,
  descricao             text not null,
  dia_mes               smallint not null check (dia_mes between 1 and 31),
  valor_esperado_cent   bigint not null default 0 check (valor_esperado_cent >= 0),
  conta_id              uuid references public.pf_contas(id) on delete set null,
  ativo                 boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- faturas de cartão
create table if not exists public.pf_faturas (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conta_id    uuid not null references public.pf_contas(id) on delete cascade,   -- o cartão
  ref_mes     date not null,                                                      -- sempre dia 1 do mês de referência
  fechamento  date not null,
  vencimento  date not null,
  status      text not null default 'aberta' check (status in ('aberta','fechada','paga')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (conta_id, ref_mes)
);

-- parcelamentos (cartão ou carnê)
create table if not exists public.pf_parcelamentos (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  descricao           text not null,
  valor_total_cent    bigint not null default 0 check (valor_total_cent >= 0),
  n_parcelas          smallint not null check (n_parcelas between 1 and 360),
  valor_parcela_cent  bigint not null default 0 check (valor_parcela_cent >= 0),
  primeira_data       date not null,
  parcela_atual       smallint not null default 0 check (parcela_atual >= 0),   -- quantas já foram pagas ao cadastrar
  forma               text not null default 'carne' check (forma in ('cartao','carne')),
  conta_id            uuid references public.pf_contas(id) on delete set null,  -- cartão, quando for o caso
  juros_total_cent    bigint check (juros_total_cent >= 0),
  categoria_id        uuid references public.pf_categorias(id) on delete set null,
  ativo               boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.pf_parcelas (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  parcelamento_id  uuid not null references public.pf_parcelamentos(id) on delete cascade,
  numero           smallint not null check (numero >= 1),
  vencimento       date not null,
  valor_cent       bigint not null default 0 check (valor_cent >= 0),
  status           text not null default 'aberta' check (status in ('aberta','paga','cancelada')),
  pago_em          date,
  fatura_id        uuid references public.pf_faturas(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (parcelamento_id, numero)
);

-- lançamentos: dinheiro que realmente entrou/saiu (positivo = entrada, negativo = saída)
-- as chaves para compromisso e parcela são ligadas mais abaixo (referência circular)
create table if not exists public.pf_lancamentos (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data            date not null,
  valor_cent      bigint not null,
  conta_id        uuid references public.pf_contas(id) on delete set null,
  categoria_id    uuid references public.pf_categorias(id) on delete set null,
  descricao       text not null default '',
  origem          text not null default 'manual' check (origem in ('manual','importado','open_finance')),
  id_externo      text,
  hash_dedup      text,
  compromisso_id  uuid,
  parcela_id      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- contas a pagar
create table if not exists public.pf_compromissos (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  descricao       text not null,
  valor_cent      bigint not null default 0 check (valor_cent >= 0),
  vencimento      date not null,
  categoria_id    uuid references public.pf_categorias(id) on delete set null,
  recorrencia     text not null default 'unica' check (recorrencia in ('unica','mensal','anual')),
  dia_venc        smallint check (dia_venc between 1 and 31),
  prioridade      text not null default 'importante' check (prioridade in ('essencial','importante','adiavel')),
  status          text not null default 'aberta' check (status in ('aberta','paga','cancelada')),
  pago_em         date,
  lancamento_id   uuid references public.pf_lancamentos(id) on delete set null,
  multa_pct       numeric(6,3) check (multa_pct >= 0),
  juros_dia_pct   numeric(6,4) check (juros_dia_pct >= 0),
  parcela_id      uuid references public.pf_parcelas(id) on delete set null,
  fatura_id       uuid references public.pf_faturas(id) on delete set null,
  origem_id       uuid references public.pf_compromissos(id) on delete set null,  -- recorrência que gerou esta ocorrência
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- dívidas fora de parcelamento
create table if not exists public.pf_dividas (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  credor               text not null,
  saldo_devedor_cent   bigint not null default 0 check (saldo_devedor_cent >= 0),
  parcela_minima_cent  bigint not null default 0 check (parcela_minima_cent >= 0),
  juros_mes_pct        numeric(7,3) check (juros_mes_pct >= 0),
  dia_venc             smallint check (dia_venc between 1 and 31),
  prioridade           text not null default 'importante' check (prioridade in ('essencial','importante','adiavel')),
  ativo                boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- aprende na importação do extrato: trecho da descrição → categoria
create table if not exists public.pf_regras_categoria (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trecho_descricao  text not null,
  categoria_id      uuid not null references public.pf_categorias(id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.pf_importacoes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  arquivo_nome  text not null,
  periodo       text,
  conta_id      uuid references public.pf_contas(id) on delete set null,
  linhas        integer not null default 0,
  novas         integer not null default 0,
  duplicadas    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- chaves circulares de pf_lancamentos (só cria se ainda não existirem)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'pf_lancamentos_compromisso_fk') then
    alter table public.pf_lancamentos add constraint pf_lancamentos_compromisso_fk
      foreign key (compromisso_id) references public.pf_compromissos(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pf_lancamentos_parcela_fk') then
    alter table public.pf_lancamentos add constraint pf_lancamentos_parcela_fk
      foreign key (parcela_id) references public.pf_parcelas(id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. Índices (todo campo usado em filtro ou junção)
-- ---------------------------------------------------------------------
create unique index if not exists pf_categorias_nome_uq      on public.pf_categorias (owner_id, tipo, nome);
create index        if not exists pf_contas_owner_idx        on public.pf_contas (owner_id, ativo);
create index        if not exists pf_recmod_owner_idx        on public.pf_recebimentos_modelo (owner_id, ativo);
create index        if not exists pf_recmod_conta_idx        on public.pf_recebimentos_modelo (conta_id);
create index        if not exists pf_faturas_venc_idx        on public.pf_faturas (owner_id, status, vencimento);
create index        if not exists pf_parcelamentos_idx       on public.pf_parcelamentos (owner_id, ativo);
create index        if not exists pf_parcelamentos_conta_idx on public.pf_parcelamentos (conta_id);
create index        if not exists pf_parcelamentos_cat_idx   on public.pf_parcelamentos (categoria_id);
create index        if not exists pf_parcelas_venc_idx       on public.pf_parcelas (owner_id, status, vencimento);
create index        if not exists pf_parcelas_parcelamento   on public.pf_parcelas (parcelamento_id);
create index        if not exists pf_parcelas_fatura_idx     on public.pf_parcelas (fatura_id);
create index        if not exists pf_lanc_data_idx           on public.pf_lancamentos (owner_id, data desc);
create index        if not exists pf_lanc_conta_idx          on public.pf_lancamentos (conta_id);
create index        if not exists pf_lanc_categoria_idx      on public.pf_lancamentos (categoria_id);
create index        if not exists pf_lanc_compromisso_idx    on public.pf_lancamentos (compromisso_id);
create index        if not exists pf_lanc_parcela_idx        on public.pf_lancamentos (parcela_id);
create unique index if not exists pf_lanc_hash_uq            on public.pf_lancamentos (owner_id, hash_dedup) where hash_dedup is not null;
create index        if not exists pf_comp_venc_idx           on public.pf_compromissos (owner_id, status, vencimento);
create index        if not exists pf_comp_categoria_idx      on public.pf_compromissos (categoria_id);
create index        if not exists pf_comp_lancamento_idx     on public.pf_compromissos (lancamento_id);
create index        if not exists pf_comp_parcela_idx        on public.pf_compromissos (parcela_id);
create index        if not exists pf_comp_fatura_idx         on public.pf_compromissos (fatura_id);
create unique index if not exists pf_comp_origem_uq          on public.pf_compromissos (origem_id, vencimento) where origem_id is not null;
create index        if not exists pf_dividas_idx             on public.pf_dividas (owner_id, ativo);
create index        if not exists pf_regras_idx              on public.pf_regras_categoria (owner_id);
create index        if not exists pf_regras_categoria_idx    on public.pf_regras_categoria (categoria_id);
create index        if not exists pf_importacoes_idx         on public.pf_importacoes (owner_id, created_at desc);

-- ---------------------------------------------------------------------
-- 5. updated_at automático
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'pf_config','pf_contas','pf_categorias','pf_recebimentos_modelo','pf_faturas','pf_parcelamentos',
    'pf_parcelas','pf_lancamentos','pf_compromissos','pf_dividas','pf_regras_categoria','pf_importacoes'
  ] loop
    execute format('drop trigger if exists trg_touch on public.%I', t);
    execute format('create trigger trg_touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. Segurança: RLS só para o dono, nada para o anon
--    Sempre (select auth.uid()) entre parênteses (calcula 1x por consulta).
-- ---------------------------------------------------------------------
alter table public.pf_dono enable row level security;
revoke all on public.pf_dono from anon, public;
revoke insert, update, delete on public.pf_dono from authenticated;   -- só se escreve pelo SQL Editor
grant select on public.pf_dono to authenticated;
drop policy if exists pf_dono_le_a_si_mesmo on public.pf_dono;
create policy pf_dono_le_a_si_mesmo on public.pf_dono for select to authenticated
  using (user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array[
    'pf_config','pf_contas','pf_categorias','pf_recebimentos_modelo','pf_faturas','pf_parcelamentos',
    'pf_parcelas','pf_lancamentos','pf_compromissos','pf_dividas','pf_regras_categoria','pf_importacoes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_dono', t);
    execute format($f$create policy %I on public.%I for all to authenticated
      using (owner_id = (select auth.uid())
             and exists (select 1 from public.pf_dono d where d.user_id = (select auth.uid()))
             and (select public.erp_mfa_ok()))
      with check (owner_id = (select auth.uid())
             and exists (select 1 from public.pf_dono d where d.user_id = (select auth.uid()))
             and (select public.erp_mfa_ok()))$f$, t || '_dono', t);
  end loop;
end $$;

analyze public.pf_config;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 7. Totais do módulo, calculados no banco (o navegador não baixa tabela
--    inteira para somar). security invoker: a RLS acima vale aqui também,
--    então quem não é o dono recebe tudo zerado.
-- ---------------------------------------------------------------------
create or replace function public.pf_resumo_base() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'saldo_contas_cent', (select coalesce(sum(saldo_inicial_cent), 0) from public.pf_contas
                           where ativo and tipo in ('corrente','dinheiro')),
    'contas_abertas', (select jsonb_build_object('n', count(*), 'total_cent', coalesce(sum(valor_cent), 0))
                         from public.pf_compromissos where status = 'aberta' and parcela_id is null and fatura_id is null),
    'parcelas_abertas', (select jsonb_build_object('n', count(*), 'total_cent', coalesce(sum(valor_cent), 0))
                           from public.pf_parcelas where status = 'aberta'),
    'parcelamentos_ativos', (select count(*) from public.pf_parcelamentos where ativo),
    'dividas', (select jsonb_build_object('n', count(*), 'saldo_cent', coalesce(sum(saldo_devedor_cent), 0),
                                          'minima_cent', coalesce(sum(parcela_minima_cent), 0))
                  from public.pf_dividas where ativo)
  )
$$;

revoke all on function public.pf_resumo_base() from public, anon;
grant execute on function public.pf_resumo_base() to authenticated;

notify pgrst, 'reload schema';
