-- =====================================================================
-- ERP Zinkra — COMANDAS (vínculo cliente → projeto → comanda → item de valor)
-- Rode DEPOIS de erp-financeiro-projetos.sql. Idempotente: pode rodar de novo.
-- Só ADICIONA coisas: não apaga tabela, coluna nem linha.
--
-- Ideia: a comanda é a conta financeira de um cliente em um projeto.
--   cliente  →  projeto  →  comanda  →  itens de valor (base, adicional, melhoria, mensalidade)
--                                    →  recebimentos (cada um pode apontar para o item que pagou)
-- Quando o cliente pedir um adicional meses depois, NÃO se cria projeto novo:
-- o item entra na mesma comanda e o histórico fica guardado.
--
-- O que este arquivo faz:
--   1. project_comandas: a comanda (ligada ao projeto e ao cliente).
--   2. project_valores ganha: comanda_id, starts_on, ends_on e o tipo 'mensalidade'
--      (amount_cents passa a ser o valor POR MÊS nesse tipo).
--   3. project_recebimentos ganha: comanda_id e valor_id (o "entrou do quê").
--   4. Cria uma comanda para cada projeto que já tem valores e liga o que existe.
--   5. project_fin_log: histórico automático (quem mexeu, quando, valor antes e depois)
--      de comandas, itens, recebimentos, comissão, pagamentos e abatimentos.
--   6. Gatilho: item ou recebimento criado sem comanda cai na comanda aberta do projeto
--      (vale também para a conciliação bancária).
-- Nenhum dado real vem neste arquivo.
-- =====================================================================

-- 1. comanda ------------------------------------------------------------
create table if not exists public.project_comandas (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  client_id   uuid references public.clients(id) on delete set null,
  title       text not null,
  status      text not null default 'aberta' check (status in ('aberta','encerrada')),
  opened_on   date not null default current_date,
  notes       text,
  owner_id    uuid default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists project_comandas_proj_idx   on public.project_comandas (project_id);
create index if not exists project_comandas_client_idx on public.project_comandas (client_id);

-- 2. itens de valor: comanda, mensalidade -------------------------------
alter table public.project_valores add column if not exists comanda_id uuid references public.project_comandas(id) on delete restrict;
alter table public.project_valores add column if not exists starts_on  date;
alter table public.project_valores add column if not exists ends_on    date;

alter table public.project_valores drop constraint if exists project_valores_kind_check;
alter table public.project_valores add  constraint project_valores_kind_check
  check (kind in ('base','adicional','melhoria','mensalidade'));
alter table public.project_valores drop constraint if exists project_valores_mensalidade_ck;
alter table public.project_valores add  constraint project_valores_mensalidade_ck
  check ((kind <> 'mensalidade' or starts_on is not null) and (ends_on is null or starts_on is null or ends_on >= starts_on));
create index if not exists project_valores_comanda_idx on public.project_valores (comanda_id);

-- 3. recebimentos: comanda e item que pagou ------------------------------
alter table public.project_recebimentos add column if not exists comanda_id uuid references public.project_comandas(id) on delete restrict;
alter table public.project_recebimentos add column if not exists valor_id   uuid references public.project_valores(id) on delete set null;
create index if not exists project_recebimentos_comanda_idx on public.project_recebimentos (comanda_id);
create index if not exists project_recebimentos_valor_idx   on public.project_recebimentos (valor_id);

-- 4. ligar o que já existe (ainda sem os gatilhos, para não gerar histórico falso)
insert into public.project_comandas (project_id, client_id, title)
select p.id, p.client_id, p.name
  from public.projects p
 where exists (select 1 from public.project_valores v where v.project_id = p.id)
   and not exists (select 1 from public.project_comandas c where c.project_id = p.id);

update public.project_valores v
   set comanda_id = (select c.id from public.project_comandas c where c.project_id = v.project_id order by c.created_at limit 1)
 where v.comanda_id is null;

update public.project_recebimentos r
   set comanda_id = (select c.id from public.project_comandas c where c.project_id = r.project_id order by c.created_at limit 1)
 where r.comanda_id is null;

-- 5. histórico automático -------------------------------------------------
create table if not exists public.project_fin_log (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid,
  comanda_id  uuid,
  tabela      text not null,
  registro_id uuid,
  acao        text not null check (acao in ('criado','alterado','apagado')),
  antes       jsonb,
  depois      jsonb,
  feito_por   uuid default auth.uid(),
  feito_em    timestamptz not null default now()
);
create index if not exists project_fin_log_proj_idx on public.project_fin_log (project_id, feito_em desc);

create or replace function public.fin_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare velho jsonb; novo jsonb; ref jsonb;
begin
  if tg_op = 'INSERT' then
    novo := to_jsonb(new); ref := novo;
  elsif tg_op = 'UPDATE' then
    velho := to_jsonb(old); novo := to_jsonb(new); ref := novo;
    if (velho - 'updated_at') = (novo - 'updated_at') then return null; end if;  -- nada mudou de verdade
  else
    velho := to_jsonb(old); ref := velho;
  end if;
  insert into public.project_fin_log (project_id, comanda_id, tabela, registro_id, acao, antes, depois)
  values (
    nullif(ref->>'project_id', '')::uuid,
    nullif(case when tg_table_name = 'project_comandas' then ref->>'id' else ref->>'comanda_id' end, '')::uuid,
    tg_table_name,
    (ref->>'id')::uuid,
    case tg_op when 'INSERT' then 'criado' when 'UPDATE' then 'alterado' else 'apagado' end,
    velho, novo);
  return null;
end $$;

-- 6. item/recebimento sem comanda cai na comanda aberta do projeto
create or replace function public.fin_comanda_padrao() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.comanda_id is null then
    select c.id into new.comanda_id
      from public.project_comandas c
     where c.project_id = new.project_id and c.status = 'aberta'
     order by c.created_at limit 1;
  end if;
  return new;
end $$;

drop trigger if exists trg_comanda_padrao on public.project_valores;
create trigger trg_comanda_padrao before insert on public.project_valores
  for each row execute function public.fin_comanda_padrao();
drop trigger if exists trg_comanda_padrao on public.project_recebimentos;
create trigger trg_comanda_padrao before insert on public.project_recebimentos
  for each row execute function public.fin_comanda_padrao();

-- ---------------------------------------------------------------------
-- Gatilhos de histórico e atualização + segurança (mesmo padrão do financeiro)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['project_comandas','project_valores','project_recebimentos','project_comissao',
                           'project_comissao_pagamentos','project_comissao_abatimentos']
  loop
    execute format('drop trigger if exists trg_fin_log on public.%I', t);
    execute format('create trigger trg_fin_log after insert or update or delete on public.%I for each row execute function public.fin_log()', t);
  end loop;

  -- project_comandas: touch + RLS
  t := 'project_comandas';
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
end $$;

-- histórico: só leitura para quem tem acesso total/leitura ao financeiro; ninguém grava pela API
alter table public.project_fin_log enable row level security;
revoke all on public.project_fin_log from anon, public;
revoke insert, update, delete on public.project_fin_log from authenticated;
grant select on public.project_fin_log to authenticated;
drop policy if exists project_fin_log_select on public.project_fin_log;
create policy project_fin_log_select on public.project_fin_log for select
  using ((select public.erp_level('financeiro')) in ('total','read'));

notify pgrst, 'reload schema';
