-- =====================================================================
-- ERP Zinkra — módulo PESSOAL, etapas 3, 4 e 5
--   3: parcelamentos, faturas de cartão, dívidas
--   4: visão geral (resumo do mês, fluxo por mês, comprometimento futuro)
--   5: importação de extrato (deduplicação, regras de categoria, conciliação)
-- Rode este arquivo inteiro no SQL Editor do Supabase, DEPOIS de
-- erp-pessoal.sql e erp-pessoal-2.sql. É idempotente: pode rodar de novo.
--
-- Isolamento (seção 2 da especificação): todas as funções são SECURITY
-- INVOKER, então a RLS "só o dono" das tabelas pf_* vale dentro delas, e
-- nenhuma é liberada para o papel anon. Sem valores reais aqui; centavos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Colunas e índices novos
-- ---------------------------------------------------------------------
alter table public.pf_lancamentos
  add column if not exists divida_id uuid references public.pf_dividas(id) on delete set null,
  add column if not exists divida_amortizado_cent bigint;   -- quanto do pagamento abateu do saldo da dívida (para desfazer)

create index        if not exists pf_lanc_divida_idx   on public.pf_lancamentos (divida_id);
-- cada fatura vira no máximo UMA conta a pagar
create unique index if not exists pf_comp_fatura_uq    on public.pf_compromissos (fatura_id) where fatura_id is not null;
-- aprende na importação: um trecho de descrição → uma categoria
create unique index if not exists pf_regras_trecho_uq  on public.pf_regras_categoria (owner_id, trecho_descricao);

-- ---------------------------------------------------------------------
-- 3.1 Datas da fatura de um cartão
-- ---------------------------------------------------------------------
-- último dia do mês de uma data
create or replace function public.pf_ultimo_dia(p_data date) returns integer
language sql immutable set search_path = public as $$
  select extract(day from (date_trunc('month', p_data) + interval '1 month - 1 day'))::integer
$$;

-- dia de fechamento da fatura do mês de referência (dia 31 em mês curto = último dia)
create or replace function public.pf_fechamento(p_conta uuid, p_ref date) returns date
language sql stable security invoker set search_path = public as $$
  select (date_trunc('month', p_ref)::date + (least(c.fechamento_dia, public.pf_ultimo_dia(p_ref)) - 1))
    from public.pf_contas c where c.id = p_conta and c.tipo = 'cartao'
$$;

-- mês da fatura em que uma compra cai: até o dia do fechamento, na do mês; depois, na seguinte
create or replace function public.pf_ref_da_compra(p_conta uuid, p_data date) returns date
language sql stable security invoker set search_path = public as $$
  select case when p_data <= public.pf_fechamento(p_conta, p_data)
              then date_trunc('month', p_data)::date
              else (date_trunc('month', p_data) + interval '1 month')::date end
$$;

-- cria (se faltar) a fatura do mês de referência de um cartão e devolve o id
create or replace function public.pf_garantir_fatura(p_conta uuid, p_ref date) returns uuid
language plpgsql security invoker set search_path = public as $$
declare c public.pf_contas; r date := date_trunc('month', p_ref)::date; fech date; vm date; venc date; fid uuid;
begin
  select * into c from public.pf_contas where id = p_conta and tipo = 'cartao';
  if not found then raise exception 'Cartão não encontrado.'; end if;
  fech := r + (least(c.fechamento_dia, public.pf_ultimo_dia(r)) - 1);
  vm := case when c.vencimento_dia > c.fechamento_dia then r else (r + interval '1 month')::date end;
  venc := vm + (least(c.vencimento_dia, public.pf_ultimo_dia(vm)) - 1);
  insert into public.pf_faturas (conta_id, ref_mes, fechamento, vencimento)
  values (p_conta, r, fech, venc) on conflict (conta_id, ref_mes) do nothing;
  select id into fid from public.pf_faturas where conta_id = p_conta and ref_mes = r;
  return fid;
end $$;

-- ---------------------------------------------------------------------
-- 3.2 Total da fatura = parcelas em aberto do ciclo + compras à vista no cartão
-- ---------------------------------------------------------------------
create or replace function public.pf_fatura_total(p_fatura uuid) returns bigint
language sql stable security invoker set search_path = public as $$
  select coalesce((select sum(p.valor_cent) from public.pf_parcelas p where p.fatura_id = f.id and p.status = 'aberta'), 0)
       + coalesce((select -sum(l.valor_cent) from public.pf_lancamentos l
                    where l.conta_id = f.conta_id and l.valor_cent < 0 and l.parcela_id is null
                      and l.data <= f.fechamento
                      and l.data > public.pf_fechamento(f.conta_id, (f.ref_mes - interval '1 month')::date)), 0)
    from public.pf_faturas f where f.id = p_fatura
$$;

-- a fatura vira uma conta a pagar no vencimento, sempre com o total atual
create or replace function public.pf_sincronizar_fatura(p_fatura uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare f public.pf_faturas; nome text; total bigint;
begin
  select * into f from public.pf_faturas where id = p_fatura;
  if not found then return; end if;
  select c.nome into nome from public.pf_contas c where c.id = f.conta_id;
  total := public.pf_fatura_total(f.id);
  if f.status = 'paga' then return; end if;
  if total <= 0 then
    delete from public.pf_compromissos where fatura_id = f.id and status = 'aberta';
    return;
  end if;
  update public.pf_compromissos set valor_cent = total, vencimento = f.vencimento,
         descricao = 'Fatura ' || nome || ' ' || to_char(f.ref_mes, 'MM/YYYY')
   where fatura_id = f.id and status = 'aberta';
  if not found and not exists (select 1 from public.pf_compromissos where fatura_id = f.id) then
    insert into public.pf_compromissos (descricao, valor_cent, vencimento, recorrencia, prioridade, fatura_id)
    values ('Fatura ' || nome || ' ' || to_char(f.ref_mes, 'MM/YYYY'), total, f.vencimento, 'unica', 'essencial', f.id);
  end if;
end $$;

-- fatura paga ou reaberta: leva as parcelas dela junto
create or replace function public.pf_marcar_fatura(p_fatura uuid, p_paga boolean, p_data date) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if p_paga then
    update public.pf_faturas set status = 'paga' where id = p_fatura;
    update public.pf_parcelas set status = 'paga', pago_em = p_data where fatura_id = p_fatura and status = 'aberta';
  else
    update public.pf_faturas set status = 'aberta' where id = p_fatura;
    update public.pf_parcelas set status = 'aberta', pago_em = null where fatura_id = p_fatura and status = 'paga' and pago_em = p_data;
    perform public.pf_sincronizar_fatura(p_fatura);
  end if;
end $$;

-- refaz a fatura de um cartão depois de mexer em uma compra à vista
create or replace function public.pf_ressincronizar_cartao(p_conta uuid, p_data date) returns void
language plpgsql security invoker set search_path = public as $$
declare fid uuid;
begin
  if not exists (select 1 from public.pf_contas where id = p_conta and tipo = 'cartao') then return; end if;
  select id into fid from public.pf_faturas where conta_id = p_conta and ref_mes = public.pf_ref_da_compra(p_conta, p_data);
  if fid is not null then perform public.pf_sincronizar_fatura(fid); end if;
end $$;

-- compra à vista no cartão: entra na fatura certa
create or replace function public.pf_gasto_cartao(p_conta uuid, p_data date, p_valor_cent bigint, p_categoria uuid default null, p_descricao text default '')
returns uuid
language plpgsql security invoker set search_path = public as $$
declare fid uuid; l uuid;
begin
  fid := public.pf_garantir_fatura(p_conta, public.pf_ref_da_compra(p_conta, p_data));
  insert into public.pf_lancamentos (data, valor_cent, conta_id, categoria_id, descricao, origem)
  values (p_data, -abs(p_valor_cent), p_conta, p_categoria, coalesce(p_descricao, ''), 'manual') returning id into l;
  perform public.pf_sincronizar_fatura(fid);
  return l;
end $$;

-- ---------------------------------------------------------------------
-- 3.3 Parcelamentos: criar (de uma vez), antecipar, apagar
-- ---------------------------------------------------------------------
-- p: { descricao, valor_total_cent, n_parcelas, valor_parcela_cent, primeira_data, parcela_atual, forma,
--      conta_id, juros_total_cent, categoria_id, parcelas: [{ numero, vencimento, valor_cent, ref_mes }] }
-- No cartão cada parcela vai para a fatura do seu mês (ref_mes) e o vencimento vem da fatura.
create or replace function public.pf_criar_parcelamento(p jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare pid uuid; x jsonb; fid uuid; venc date; faturas uuid[] := '{}';
begin
  insert into public.pf_parcelamentos (descricao, valor_total_cent, n_parcelas, valor_parcela_cent, primeira_data, parcela_atual, forma, conta_id, juros_total_cent, categoria_id)
  values (p->>'descricao', (p->>'valor_total_cent')::bigint, (p->>'n_parcelas')::smallint, (p->>'valor_parcela_cent')::bigint,
          (p->>'primeira_data')::date, coalesce((p->>'parcela_atual')::smallint, 0), p->>'forma',
          nullif(p->>'conta_id', '')::uuid, nullif(p->>'juros_total_cent', '')::bigint, nullif(p->>'categoria_id', '')::uuid)
  returning id into pid;
  for x in select * from jsonb_array_elements(p->'parcelas') loop
    fid := null; venc := (x->>'vencimento')::date;
    if p->>'forma' = 'cartao' then
      fid := public.pf_garantir_fatura((p->>'conta_id')::uuid, (x->>'ref_mes')::date);
      select vencimento into venc from public.pf_faturas where id = fid;
      faturas := faturas || fid;
    end if;
    insert into public.pf_parcelas (parcelamento_id, numero, vencimento, valor_cent, fatura_id)
    values (pid, (x->>'numero')::smallint, venc, (x->>'valor_cent')::bigint, fid);
  end loop;
  for fid in select distinct unnest(faturas) loop perform public.pf_sincronizar_fatura(fid); end loop;
  return pid;
end $$;

-- paga várias parcelas de uma vez (antecipar). Cada uma gera o seu lançamento.
create or replace function public.pf_antecipar_parcelas(p_ids uuid[], p_data date, p_conta uuid default null) returns integer
language plpgsql security invoker set search_path = public as $$
declare i uuid; v bigint; fid uuid; n integer := 0;
begin
  foreach i in array p_ids loop
    select valor_cent, fatura_id into v, fid from public.pf_parcelas where id = i and status = 'aberta';
    if found then
      perform public.pf_pagar_parcela(i, p_data, v, p_conta, true);
      if fid is not null then perform public.pf_sincronizar_fatura(fid); end if;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function public.pf_apagar_parcelamento(p_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare fid uuid; fs uuid[];
begin
  select array_agg(distinct fatura_id) filter (where fatura_id is not null) into fs from public.pf_parcelas where parcelamento_id = p_id;
  delete from public.pf_parcelamentos where id = p_id;
  if fs is not null then foreach fid in array fs loop perform public.pf_sincronizar_fatura(fid); end loop; end if;
end $$;

-- resumo de cada parcelamento ativo (quanto falta é a soma real das parcelas em aberto)
create or replace function public.pf_parcelamentos_resumo() returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'descricao', p.descricao, 'forma', p.forma, 'conta_id', p.conta_id, 'n_parcelas', p.n_parcelas,
    'valor_parcela_cent', p.valor_parcela_cent, 'valor_total_cent', p.valor_total_cent, 'juros_total_cent', p.juros_total_cent,
    'pagas', p.n_parcelas - a.abertas, 'abertas', a.abertas, 'falta_cent', a.falta,
    'proxima', a.proxima, 'ultima', a.ultima, 'categoria_id', p.categoria_id
  ) order by a.ultima nulls last, p.descricao), '[]'::jsonb)
  from public.pf_parcelamentos p
  cross join lateral (
    select count(*) filter (where pa.status = 'aberta') as abertas,
           coalesce(sum(pa.valor_cent) filter (where pa.status = 'aberta'), 0) as falta,
           min(pa.vencimento) filter (where pa.status = 'aberta') as proxima,
           max(pa.vencimento) filter (where pa.status = 'aberta') as ultima
      from public.pf_parcelas pa where pa.parcelamento_id = p.id
  ) a
  where p.ativo
$$;

-- faturas de cartão ainda não pagas, com o total calculado
create or replace function public.pf_faturas_abertas() returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id, 'conta_id', f.conta_id, 'cartao', c.nome, 'ref_mes', f.ref_mes, 'fechamento', f.fechamento, 'vencimento', f.vencimento,
    'total_cent', public.pf_fatura_total(f.id)
  ) order by f.vencimento), '[]'::jsonb)
  from public.pf_faturas f join public.pf_contas c on c.id = f.conta_id
  where f.status <> 'paga' and f.vencimento >= current_date - 60
$$;

-- ---------------------------------------------------------------------
-- 3.4 Dívidas: pagar abate do saldo (menos os juros do mês) e dá para desfazer
-- ---------------------------------------------------------------------
create or replace function public.pf_pagar_divida(p_id uuid, p_data date, p_valor_cent bigint, p_conta uuid default null) returns uuid
language plpgsql security invoker set search_path = public as $$
declare d public.pf_dividas; juros bigint; amort bigint; l uuid; cat uuid;
begin
  select * into d from public.pf_dividas where id = p_id for update;
  if not found then raise exception 'Dívida não encontrada.'; end if;
  juros := round(d.saldo_devedor_cent * coalesce(d.juros_mes_pct, 0) / 100);
  amort := least(d.saldo_devedor_cent, greatest(0, abs(p_valor_cent) - juros));
  select id into cat from public.pf_categorias where nome = 'Dívidas' and tipo = 'saida' limit 1;
  insert into public.pf_lancamentos (data, valor_cent, conta_id, categoria_id, descricao, origem, divida_id, divida_amortizado_cent)
  values (p_data, -abs(p_valor_cent), p_conta, cat, 'Dívida: ' || d.credor, 'manual', d.id, amort) returning id into l;
  update public.pf_dividas set saldo_devedor_cent = saldo_devedor_cent - amort where id = d.id;
  return l;
end $$;

-- ---------------------------------------------------------------------
-- 3.5 Pagar / reabrir conta e apagar lançamento, agora também com fatura, dívida e cartão
--     (substitui as versões do erp-pessoal-2.sql)
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
  if c.fatura_id is not null then perform public.pf_marcar_fatura(c.fatura_id, true, p_data); end if;
  return l;
end $$;

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
  if c.fatura_id is not null then perform public.pf_marcar_fatura(c.fatura_id, false, c.pago_em); end if;
end $$;

create or replace function public.pf_desfazer_lancamento(p_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare l public.pf_lancamentos; c public.pf_compromissos;
begin
  select * into l from public.pf_lancamentos where id = p_id for update;
  if not found then raise exception 'Lançamento não encontrado.'; end if;
  if l.compromisso_id is not null then
    select * into c from public.pf_compromissos where id = l.compromisso_id;
    update public.pf_compromissos set status = 'aberta', pago_em = null, lancamento_id = null where id = l.compromisso_id;
    if c.fatura_id is not null then perform public.pf_marcar_fatura(c.fatura_id, false, c.pago_em); end if;
  end if;
  if l.parcela_id is not null then
    update public.pf_parcelas set status = 'aberta', pago_em = null where id = l.parcela_id;
    perform public.pf_sincronizar_fatura(fatura_id) from public.pf_parcelas where id = l.parcela_id and fatura_id is not null;
  end if;
  if l.divida_id is not null and l.divida_amortizado_cent is not null then
    update public.pf_dividas set saldo_devedor_cent = saldo_devedor_cent + l.divida_amortizado_cent where id = l.divida_id;
  end if;
  delete from public.pf_lancamentos where id = l.id;
  if l.conta_id is not null then perform public.pf_ressincronizar_cartao(l.conta_id, l.data); end if;
end $$;

-- ---------------------------------------------------------------------
-- 3.6 Comprometimento futuro por mês (parcelas, contas fixas, dívidas) e a renda esperada
--     Usado pelo alerta da tela Parcelamentos e pelo gráfico da Visão geral.
--     Contas mensais além dos 90 dias já gerados entram pelo valor da última ocorrência.
-- ---------------------------------------------------------------------
create or replace function public.pf_comprometimento(p_meses integer default 12) returns jsonb
language sql stable security invoker set search_path = public as $$
  with meses as (
    select (date_trunc('month', current_date) + (g || ' month')::interval)::date as m
      from generate_series(0, greatest(p_meses, 1) - 1) g
  ),
  renda as (select coalesce(sum(valor_esperado_cent), 0) as r from public.pf_recebimentos_modelo where ativo),
  dv as (select coalesce(sum(parcela_minima_cent), 0) as d from public.pf_dividas where ativo),
  series as (
    select s.id, s.vencimento,
           coalesce((select o.valor_cent from public.pf_compromissos o where o.origem_id = s.id and o.status <> 'cancelada' order by o.vencimento desc limit 1), s.valor_cent) as valor
      from public.pf_compromissos s
     where s.recorrencia = 'mensal' and s.origem_id is null and s.status <> 'cancelada' and s.fatura_id is null and s.parcela_id is null
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'mes', m.m,
    'parcelas_cent', coalesce((select sum(p.valor_cent) from public.pf_parcelas p
                                where p.status = 'aberta' and p.vencimento >= m.m and p.vencimento < m.m + interval '1 month'), 0),
    'fixas_cent',
        coalesce((select sum(c.valor_cent) from public.pf_compromissos c
                   where c.status = 'aberta' and c.parcela_id is null and c.fatura_id is null
                     and c.vencimento >= m.m and c.vencimento < m.m + interval '1 month'), 0)
      + coalesce((select sum(f.valor_cent - coalesce((select sum(p.valor_cent) from public.pf_parcelas p where p.fatura_id = f.fatura_id and p.status = 'aberta'), 0))
                    from public.pf_compromissos f
                   where f.status = 'aberta' and f.fatura_id is not null
                     and f.vencimento >= m.m and f.vencimento < m.m + interval '1 month'), 0)
      + coalesce((select sum(s.valor) from series s
                   where date_trunc('month', s.vencimento) < m.m
                     and not exists (select 1 from public.pf_compromissos x
                                      where (x.id = s.id or x.origem_id = s.id) and x.status <> 'cancelada'
                                        and x.vencimento >= m.m and x.vencimento < m.m + interval '1 month')), 0),
    'dividas_cent', (select d from dv),
    'renda_cent', (select r from renda)
  ) order by m.m), '[]'::jsonb)
  from meses m
$$;

-- ---------------------------------------------------------------------
-- Permissões das funções da etapa 3
-- ---------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'pf_ultimo_dia(date)', 'pf_fechamento(uuid,date)', 'pf_ref_da_compra(uuid,date)', 'pf_garantir_fatura(uuid,date)', 'pf_fatura_total(uuid)',
    'pf_sincronizar_fatura(uuid)', 'pf_marcar_fatura(uuid,boolean,date)', 'pf_ressincronizar_cartao(uuid,date)',
    'pf_gasto_cartao(uuid,date,bigint,uuid,text)', 'pf_criar_parcelamento(jsonb)', 'pf_antecipar_parcelas(uuid[],date,uuid)',
    'pf_apagar_parcelamento(uuid)', 'pf_parcelamentos_resumo()', 'pf_faturas_abertas()', 'pf_pagar_divida(uuid,date,bigint,uuid)',
    'pf_pagar_compromisso(uuid,date,bigint,uuid,boolean)', 'pf_reabrir_compromisso(uuid)', 'pf_desfazer_lancamento(uuid)', 'pf_comprometimento(integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
