-- =====================================================================
-- ERP Zinkra — BANCO (lançamentos do Nu Empresas e conciliação)
-- Rode DEPOIS de erp-financeiro-projetos.sql. Idempotente.
--
-- PRIVACIDADE: dados bancários são sensíveis.
--   * RLS: só o Diretor geral (e com 2FA válido, quando ativado) lê ou grava.
--     Nenhum outro papel e nenhum acesso anônimo.
--   * Não se grava senha, token de acesso nem chave do provedor. Chaves ficam
--     só em variáveis de ambiente do servidor (Vercel).
--   * Só o necessário: data, descrição, valor, sentido, nome da contraparte.
--
-- Tabelas:
--   bank_imports       registro de cada importação (o que entrou e quando)
--   bank_transactions  lançamentos; external_id único = nunca duplica
--   bank_rules         memória "contraparte -> destino" aprendida nas correções
-- Funções (security invoker, então a RLS vale dentro delas):
--   bank_conciliar(...)  cria o recebimento/pagamento ligado ao lançamento
--   bank_desfazer(...)   desfaz e volta o lançamento para pendente
-- =====================================================================

create table if not exists public.bank_imports (
  id          uuid primary key default gen_random_uuid(),
  source      text not null check (source in ('arquivo','pluggy')),
  file_name   text,
  total       int not null default 0,
  novos       int not null default 0,
  duplicados  int not null default 0,
  period_from date,
  period_to   date,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

create table if not exists public.bank_transactions (
  id           uuid primary key default gen_random_uuid(),
  external_id  text not null,                       -- id do banco/arquivo; único
  source       text not null default 'arquivo' check (source in ('arquivo','pluggy')),
  import_id    uuid references public.bank_imports(id) on delete set null,
  posted_on    date not null,
  description  text not null default '',
  amount_cents bigint not null check (amount_cents > 0),   -- sempre positivo
  direction    text not null check (direction in ('entrada','saida')),
  counterparty text,
  status       text not null default 'pendente' check (status in ('pendente','conciliado','ignorado')),
  target_type  text check (target_type in ('recebimento','pagamento_comissao','conta_pagar')),
  target_id    uuid,
  project_id   uuid references public.projects(id) on delete set null,
  reconciled_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint bank_tx_external_uq unique (external_id),
  constraint bank_tx_target_ck check ((status = 'conciliado') = (target_type is not null))
);
create index if not exists bank_tx_status_idx on public.bank_transactions (status, posted_on desc);
create index if not exists bank_tx_project_idx on public.bank_transactions (project_id);

create table if not exists public.bank_rules (
  id           uuid primary key default gen_random_uuid(),
  counterparty_key text not null,                   -- nome normalizado (sem acento, minúsculo)
  direction    text not null check (direction in ('entrada','saida')),
  target_type  text not null check (target_type in ('recebimento','pagamento_comissao','conta_pagar','ignorar')),
  project_id   uuid references public.projects(id) on delete cascade,
  uses         int not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (counterparty_key, direction)
);

-- as ligações dos recebimentos/pagamentos com o lançamento
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'project_recebimentos_bank_fk') then
    alter table public.project_recebimentos add constraint project_recebimentos_bank_fk
      foreign key (bank_tx_id) references public.bank_transactions(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'project_comissao_pagamentos_bank_fk') then
    alter table public.project_comissao_pagamentos add constraint project_comissao_pagamentos_bank_fk
      foreign key (bank_tx_id) references public.bank_transactions(id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- RLS: SÓ O DIRETOR
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['bank_imports','bank_transactions','bank_rules'] loop
    execute format('drop trigger if exists trg_touch on public.%I', t);
    if t <> 'bank_imports' then
      execute format('create trigger trg_touch before update on public.%I for each row execute function public.touch_updated_at()', t);
    end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_diretor', t);
    execute format($f$create policy %I on public.%I for all to authenticated
      using ((select public.erp_is_director()) and (select public.erp_mfa_ok()))
      with check ((select public.erp_is_director()) and (select public.erp_mfa_ok()))$f$, t || '_diretor', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Conciliar: cria o lançamento do ERP já ligado ao do banco, numa transação.
--   p_tipo: 'recebimento' | 'pagamento_comissao' | 'conta_pagar'
--   p_alvo: id do projeto (recebimento / pagamento_comissao) ou da conta a pagar
--   p_memorizar: guarda a regra contraparte -> destino para as próximas vezes
-- ---------------------------------------------------------------------
create or replace function public.bank_conciliar(p_tx uuid, p_tipo text, p_alvo uuid, p_memorizar boolean default false)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  tx public.bank_transactions;
  novo uuid;
  proj uuid := null;
  chave text;
begin
  select * into tx from public.bank_transactions where id = p_tx for update;
  if not found then raise exception 'Lançamento não encontrado.'; end if;
  if tx.status = 'conciliado' then raise exception 'Este lançamento já foi conciliado.'; end if;

  if p_tipo = 'recebimento' then
    if tx.direction <> 'entrada' then raise exception 'Só uma entrada pode virar recebimento.'; end if;
    insert into public.project_recebimentos (project_id, amount_cents, received_on, method, notes, bank_tx_id)
    values (p_alvo, tx.amount_cents, tx.posted_on, 'Pix', 'Conciliado: ' || left(tx.description, 120), tx.id)
    returning id into novo;
    proj := p_alvo;
  elsif p_tipo = 'pagamento_comissao' then
    if tx.direction <> 'saida' then raise exception 'Só uma saída pode virar pagamento de comissão.'; end if;
    insert into public.project_comissao_pagamentos (project_id, amount_cents, paid_on, notes, bank_tx_id)
    values (p_alvo, tx.amount_cents, tx.posted_on, 'Conciliado: ' || left(tx.description, 120), tx.id)
    returning id into novo;
    proj := p_alvo;
  elsif p_tipo = 'conta_pagar' then
    if tx.direction <> 'saida' then raise exception 'Só uma saída pode pagar uma conta.'; end if;
    update public.payables set paid_on = tx.posted_on where id = p_alvo and paid_on is null;
    if not found then raise exception 'Conta a pagar não encontrada ou já paga.'; end if;
    novo := p_alvo;
  else
    raise exception 'Destino inválido.';
  end if;

  update public.bank_transactions
     set status = 'conciliado', target_type = p_tipo, target_id = novo, project_id = proj, reconciled_at = now()
   where id = tx.id;

  if p_memorizar and coalesce(tx.counterparty, '') <> '' then
    chave := public.bank_chave(tx.counterparty);
    insert into public.bank_rules (counterparty_key, direction, target_type, project_id)
    values (chave, tx.direction, p_tipo, proj)
    on conflict (counterparty_key, direction)
    do update set target_type = excluded.target_type, project_id = excluded.project_id,
                  uses = public.bank_rules.uses + 1;
  end if;
  return novo;
end $$;

-- mesma normalização usada no navegador (lib/banco/conciliacao.js -> chaveContraparte)
create or replace function public.bank_chave(p text) returns text
language sql immutable as $$
  select trim(regexp_replace(lower(translate(coalesce(p, ''),
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')), '[^a-z0-9]+', ' ', 'g'))
$$;

create or replace function public.bank_desfazer(p_tx uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare tx public.bank_transactions;
begin
  select * into tx from public.bank_transactions where id = p_tx for update;
  if not found then raise exception 'Lançamento não encontrado.'; end if;
  if tx.status = 'ignorado' then
    update public.bank_transactions set status = 'pendente' where id = tx.id;
    return;
  end if;
  if tx.status <> 'conciliado' then return; end if;

  if tx.target_type = 'recebimento' then
    delete from public.project_recebimentos where id = tx.target_id and bank_tx_id = tx.id;
  elsif tx.target_type = 'pagamento_comissao' then
    delete from public.project_comissao_pagamentos where id = tx.target_id and bank_tx_id = tx.id;
  elsif tx.target_type = 'conta_pagar' then
    update public.payables set paid_on = null where id = tx.target_id;
  end if;

  update public.bank_transactions
     set status = 'pendente', target_type = null, target_id = null, project_id = null, reconciled_at = null
   where id = tx.id;
end $$;

revoke all on function public.bank_conciliar(uuid, text, uuid, boolean) from public, anon;
revoke all on function public.bank_desfazer(uuid) from public, anon;
grant execute on function public.bank_conciliar(uuid, text, uuid, boolean) to authenticated;
grant execute on function public.bank_desfazer(uuid) to authenticated;

notify pgrst, 'reload schema';
