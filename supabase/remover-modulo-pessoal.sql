-- =====================================================================
-- ERP Zinkra — REMOÇÃO do módulo Pessoal (finanças pessoais)
-- Cole este arquivo inteiro no SQL Editor do Supabase e rode UMA vez.
--
-- O que ele faz, nesta ordem:
--   1. Guarda uma CÓPIA de cada tabela pf_* em tabelas de arquivo morto
--      chamadas pessoal_arquivo_* (e o texto das funções pf_*, em
--      pessoal_arquivo_funcoes). As cópias ficam trancadas: ninguém acessa
--      pela API do ERP (RLS ligada, sem política, sem permissão para anon e
--      authenticated). Você lê só pelo SQL Editor.
--   2. Confere se cada cópia tem o mesmo número de linhas da original.
--      Se qualquer conferência falhar, TUDO é cancelado e nada é apagado.
--   3. Só então apaga as funções pf_* e as tabelas pf_* (políticas, gatilhos
--      e índices vão junto).
--   4. A remoção DEFINITIVA das cópias (pessoal_arquivo_*) está comentada no
--      fim do arquivo. Descomente e rode só quando tiver certeza.
--
-- É seguro rodar de novo: se as tabelas pf_* já não existirem, ele só avisa.
-- Para RECUPERAR um dado depois, veja o bloco de exemplo no fim do arquivo.
--
-- Nada além do módulo Pessoal é tocado: contas a pagar, faturamento, fluxo de
-- caixa, projetos, clientes e permissões continuam como estão.
-- =====================================================================

do $$
declare
  nomes text[] := array[
    'dono', 'config', 'contas', 'categorias', 'recebimentos_modelo', 'faturas', 'parcelamentos',
    'parcelas', 'lancamentos', 'compromissos', 'dividas', 'regras_categoria', 'importacoes'
  ];
  n text;
  origem text;
  arquivo text;
  c_origem bigint;
  c_arquivo bigint;
  f record;
begin
  -- 1. cópia das tabelas ------------------------------------------------
  foreach n in array nomes loop
    origem  := 'pf_' || n;
    arquivo := 'pessoal_arquivo_' || n;

    if to_regclass('public.' || origem) is null then
      raise notice 'Tabela % já não existe, nada a copiar.', origem;
      continue;
    end if;

    if to_regclass('public.' || arquivo) is not null then
      raise notice 'A cópia % já existe e NÃO será sobrescrita.', arquivo;
    else
      execute format('create table public.%I as table public.%I', arquivo, origem);
      execute format('alter table public.%I enable row level security', arquivo);
      execute format('revoke all on public.%I from anon, authenticated, public', arquivo);
    end if;

    -- 2. conferência ----------------------------------------------------
    execute format('select count(*) from public.%I', origem)  into c_origem;
    execute format('select count(*) from public.%I', arquivo) into c_arquivo;
    if c_arquivo < c_origem then
      raise exception 'Conferência falhou em %: original % linhas, cópia % linhas. Nada foi apagado.',
        origem, c_origem, c_arquivo;
    end if;
    raise notice '% copiada: % linha(s).', origem, c_origem;
  end loop;

  -- cópia do texto das funções (para poder recriar o módulo, se um dia precisar)
  if to_regclass('public.pessoal_arquivo_funcoes') is null then
    create table public.pessoal_arquivo_funcoes (
      nome       text primary key,
      definicao  text not null,
      guardado_em timestamptz not null default now()
    );
    alter table public.pessoal_arquivo_funcoes enable row level security;
    revoke all on public.pessoal_arquivo_funcoes from anon, authenticated, public;
  end if;

  for f in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.proname like 'pf\_%'
  loop
    insert into public.pessoal_arquivo_funcoes (nome, definicao)
    values (f.proname || '(' || f.args || ')', pg_get_functiondef(f.oid))
    on conflict (nome) do nothing;
  end loop;

  -- 3. remoção ------------------------------------------------------------
  -- funções primeiro (nenhuma é usada fora do módulo Pessoal)
  for f in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.proname like 'pf\_%'
  loop
    execute format('drop function if exists public.%I(%s) cascade', f.proname, f.args);
  end loop;

  -- tabelas (cascade só alcança objetos pf_*: políticas, gatilhos e índices delas)
  foreach n in array nomes loop
    execute format('drop table if exists public.%I cascade', 'pf_' || n);
  end loop;

  raise notice 'Módulo Pessoal removido. As cópias estão em pessoal_arquivo_*.';
end $$;

notify pgrst, 'reload schema';

-- Conferência rápida (rode depois; as duas primeiras devem voltar vazias):
--   select tablename from pg_tables where schemaname = 'public' and tablename like 'pf\_%';
--   select proname   from pg_proc   where pronamespace = 'public'::regnamespace and proname like 'pf\_%';
--   select tablename from pg_tables where schemaname = 'public' and tablename like 'pessoal\_arquivo\_%';  -- as cópias

-- ---------------------------------------------------------------------
-- RECUPERAR um dado (exemplo): recria a tabela e devolve as linhas.
--   create table public.pf_contas as table public.pessoal_arquivo_contas;
-- O texto das funções antigas está em pessoal_arquivo_funcoes.definicao.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- >>> REMOÇÃO DEFINITIVA DAS CÓPIAS — comentada de propósito. <<<
-- Só descomente e rode quando você tiver certeza de que não precisa mais
-- de nada do módulo Pessoal. Depois disso NÃO há como recuperar.
--
-- do $$
-- declare t text;
-- begin
--   for t in select tablename from pg_tables
--             where schemaname = 'public' and tablename like 'pessoal\_arquivo\_%'
--   loop
--     execute format('drop table public.%I', t);
--   end loop;
-- end $$;
-- ---------------------------------------------------------------------
