-- =====================================================================
-- ERP Zinkra — módulo PESSOAL, etapa 2 (núcleo: recebimentos, contas, hoje)
-- Rode este arquivo inteiro no SQL Editor do Supabase, DEPOIS de
-- supabase/erp-pessoal.sql (etapa 1). É idempotente: pode rodar de novo.
--
-- Mantém as regras de isolamento: tudo continua sob a RLS "só o dono" das
-- tabelas pf_*. As funções abaixo são SECURITY INVOKER (usam a sessão de
-- quem chama, então a RLS vale) e não são liberadas para o papel anon.
-- Nenhum valor real neste arquivo. Valores em centavos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Qual recebimento fixo um lançamento de entrada quitou
--    (para não cobrar de novo o "Registrar recebimento")
-- ---------------------------------------------------------------------
alter table public.pf_lancamentos
  add column if not exists recebimento_modelo_id uuid references public.pf_recebimentos_modelo(id) on delete set null,
  add column if not exists recebimento_ref       date;   -- data nominal da ocorrência (dia do mês, sem ajuste de fim de semana)

create index        if not exists pf_lanc_recmod_idx on public.pf_lancamentos (recebimento_modelo_id);
-- uma ocorrência de recebimento só pode ser registrada uma vez
create unique index if not exists pf_lanc_recmod_uq  on public.pf_lancamentos (recebimento_modelo_id, recebimento_ref)
  where recebimento_modelo_id is not null;
-- gastos do dia: filtro por data + valor
create index        if not exists pf_lanc_owner_data_idx on public.pf_lancamentos (owner_id, data, valor_cent);

-- ---------------------------------------------------------------------
-- 2. Saldo real de cada conta (corrente e dinheiro)
--    saldo = saldo informado + lançamentos desde a data em que foi informado
-- ---------------------------------------------------------------------
create or replace function public.pf_saldos() returns jsonb
language sql stable security invoker set search_path = public as $$
  with s as (
    select c.id, c.nome, c.tipo,
           c.saldo_inicial_cent + coalesce((
             select sum(l.valor_cent) from public.pf_lancamentos l
              where l.conta_id = c.id and l.data >= coalesce(c.data_saldo_inicial, date '1900-01-01')
           ), 0) as saldo_cent
      from public.pf_contas c
     where c.ativo and c.tipo in ('corrente','dinheiro')
  )
  select jsonb_build_object(
    'total_cent', coalesce((select sum(saldo_cent) from s), 0),
    'contas', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'tipo', tipo, 'saldo_cent', saldo_cent) order by nome) from s), '[]'::jsonb)
  )
$$;

-- quanto já foi separado para a reserva (lançamentos de saída na categoria "Reserva")
create or replace function public.pf_reserva_atual() returns bigint
language sql stable security invoker set search_path = public as $$
  select coalesce(-sum(l.valor_cent), 0)::bigint
    from public.pf_lancamentos l
    join public.pf_categorias c on c.id = l.categoria_id
   where c.nome = 'Reserva' and c.tipo = 'saida'
$$;

-- ---------------------------------------------------------------------
-- 3. Pagar uma conta / parcela (gera o lançamento) e desfazer
--    Tudo numa transação só: ou grava o lançamento e dá baixa, ou não faz nada.
-- ---------------------------------------------------------------------
create or replace function public.pf_pagar_compromisso(
  p_id uuid, p_data date, p_valor_cent bigint, p_conta uuid default null, p_gerar_lancamento boolean default true
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare c public.pf_compromissos; l uuid;
begin
  select * into c from public.pf_compromissos where id = p_id for update;
  if not found then raise exception 'Conta não encontrada.'; end if;
  if c.status <> 'aberta' then raise exception 'Essa conta já foi paga ou cancelada.'; end if;
  if p_gerar_lancamento then
    insert into public.pf_lancamentos (data, valor_cent, conta_id, categoria_id, descricao, origem, compromisso_id)
    values (p_data, -abs(p_valor_cent), p_conta, c.categoria_id, c.descricao, 'manual', c.id)
    returning id into l;
  end if;
  update public.pf_compromissos set status = 'paga', pago_em = p_data, lancamento_id = l where id = c.id;
  return l;
end $$;

create or replace function public.pf_pagar_parcela(
  p_id uuid, p_data date, p_valor_cent bigint, p_conta uuid default null, p_gerar_lancamento boolean default true
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare pa public.pf_parcelas; pm public.pf_parcelamentos; l uuid;
begin
  select * into pa from public.pf_parcelas where id = p_id for update;
  if not found then raise exception 'Parcela não encontrada.'; end if;
  if pa.status <> 'aberta' then raise exception 'Essa parcela já foi paga.'; end if;
  select * into pm from public.pf_parcelamentos where id = pa.parcelamento_id;
  if p_gerar_lancamento then
    insert into public.pf_lancamentos (data, valor_cent, conta_id, categoria_id, descricao, origem, parcela_id)
    values (p_data, -abs(p_valor_cent), p_conta, pm.categoria_id, pm.descricao || ' (' || pa.numero || '/' || pm.n_parcelas || ')', 'manual', pa.id)
    returning id into l;
  end if;
  update public.pf_parcelas set status = 'paga', pago_em = p_data where id = pa.id;
  return l;
end $$;

-- apaga um lançamento; se ele tinha pago uma conta ou parcela, reabre a conta/parcela
create or replace function public.pf_desfazer_lancamento(p_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare l public.pf_lancamentos;
begin
  select * into l from public.pf_lancamentos where id = p_id for update;
  if not found then raise exception 'Lançamento não encontrado.'; end if;
  if l.compromisso_id is not null then
    update public.pf_compromissos set status = 'aberta', pago_em = null, lancamento_id = null where id = l.compromisso_id;
  end if;
  if l.parcela_id is not null then
    update public.pf_parcelas set status = 'aberta', pago_em = null where id = l.parcela_id;
  end if;
  delete from public.pf_lancamentos where id = l.id;
end $$;

-- reabre uma conta paga (ou dada como paga sem lançamento)
create or replace function public.pf_reabrir_compromisso(p_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare c public.pf_compromissos;
begin
  select * into c from public.pf_compromissos where id = p_id for update;
  if not found then raise exception 'Conta não encontrada.'; end if;
  if c.lancamento_id is not null then
    delete from public.pf_lancamentos where id = c.lancamento_id;
  end if;
  update public.pf_compromissos set status = 'aberta', pago_em = null, lancamento_id = null where id = c.id;
end $$;

-- ---------------------------------------------------------------------
-- 4. Contas recorrentes: grava as ocorrências que o app calculou, sem duplicar
--    (o índice único pf_comp_origem_uq já impede repetir origem + vencimento)
-- ---------------------------------------------------------------------
create or replace function public.pf_inserir_ocorrencias(p_linhas jsonb) returns integer
language plpgsql security invoker set search_path = public as $$
declare n integer;
begin
  with ins as (
    insert into public.pf_compromissos
      (descricao, valor_cent, vencimento, categoria_id, recorrencia, dia_venc, prioridade, multa_pct, juros_dia_pct, status, origem_id)
    select x.descricao, x.valor_cent, x.vencimento, x.categoria_id, x.recorrencia, x.dia_venc, x.prioridade, x.multa_pct, x.juros_dia_pct, 'aberta', x.origem_id
      from jsonb_to_recordset(p_linhas) as x(
        descricao text, valor_cent bigint, vencimento date, categoria_id uuid, recorrencia text, dia_venc smallint,
        prioridade text, multa_pct numeric, juros_dia_pct numeric, origem_id uuid)
      -- só se a série é mesmo do dono (a RLS também barra, isto evita erro estranho)
      where exists (select 1 from public.pf_compromissos o where o.id = x.origem_id)
    on conflict (origem_id, vencimento) where origem_id is not null do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- 5. Permissões: só usuário logado (a RLS decide se é o dono). Nada para anon.
-- ---------------------------------------------------------------------
revoke all on function public.pf_saldos()                                    from public, anon;
revoke all on function public.pf_reserva_atual()                             from public, anon;
revoke all on function public.pf_pagar_compromisso(uuid, date, bigint, uuid, boolean) from public, anon;
revoke all on function public.pf_pagar_parcela(uuid, date, bigint, uuid, boolean)     from public, anon;
revoke all on function public.pf_desfazer_lancamento(uuid)                   from public, anon;
revoke all on function public.pf_reabrir_compromisso(uuid)                   from public, anon;
revoke all on function public.pf_inserir_ocorrencias(jsonb)                  from public, anon;
grant execute on function public.pf_saldos()                                    to authenticated;
grant execute on function public.pf_reserva_atual()                             to authenticated;
grant execute on function public.pf_pagar_compromisso(uuid, date, bigint, uuid, boolean) to authenticated;
grant execute on function public.pf_pagar_parcela(uuid, date, bigint, uuid, boolean)     to authenticated;
grant execute on function public.pf_desfazer_lancamento(uuid)                   to authenticated;
grant execute on function public.pf_reabrir_compromisso(uuid)                   to authenticated;
grant execute on function public.pf_inserir_ocorrencias(jsonb)                  to authenticated;

analyze public.pf_lancamentos;
notify pgrst, 'reload schema';
