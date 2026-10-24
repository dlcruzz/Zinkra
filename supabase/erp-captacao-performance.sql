-- ============================================================================
-- ERP Zinkra · Captação rápida (rodar UMA vez no Supabase → SQL Editor)
-- Pode rodar de novo sem problema: tudo aqui é idempotente. Não apaga dados.
--
-- Corrige o erro "canceling statement due to statement timeout" na Captação:
--  1) políticas de segurança (RLS) de leitura passam a calcular o papel do
--     usuário UMA vez por consulta (antes era uma vez por linha, milhares)
--  2) índices que faltavam em search_terms, leads e capture_batches
--  3) funções que contam e agrupam dentro do banco (o navegador não baixa mais
--     a tabela inteira só para somar)
-- ============================================================================

-- 0) "dobra" texto como o navegador faz (minúsculo, sem acento, espaços únicos)
create or replace function public.captacao_fold(t text) returns text
language sql immutable parallel safe as $$
  select btrim(regexp_replace(
    translate(lower(coalesce(t, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
    '\s+', ' ', 'g'))
$$;

-- 1) índices
create index if not exists search_terms_uf_nichefold_idx on public.search_terms (uf, public.captacao_fold(niche)) where archived_at is null;
create index if not exists search_terms_uf_cityfold_idx  on public.search_terms (uf, public.captacao_fold(city))  where archived_at is null;
create index if not exists search_terms_batch_idx        on public.search_terms (batch_id) where batch_id is not null;
create index if not exists leads_search_term_idx         on public.leads (search_term_id) where search_term_id is not null;
create index if not exists leads_niche_idx               on public.leads (niche);
create index if not exists leads_active_created_idx      on public.leads (created_at desc) where archived_at is null;
create index if not exists capture_batches_created_idx   on public.capture_batches (created_at desc) where archived_at is null;
create index if not exists activities_lead_type_idx      on public.activities (lead_id, type);

-- 2) RLS de leitura: (select ...) faz o Postgres calcular o papel uma vez só por consulta
drop policy if exists terms_read_any on public.search_terms;
create policy terms_read_any on public.search_terms for select using ((select public.erp_level('prospeccao')) <> 'none');

drop policy if exists search_terms_select on public.search_terms;
create policy search_terms_select on public.search_terms for select using (
  (select public.erp_level('prospeccao')) in ('total','read')
  or ((select public.erp_level('prospeccao')) = 'own' and owner_id = (select auth.uid())));

drop policy if exists capture_batches_select on public.capture_batches;
create policy capture_batches_select on public.capture_batches for select using (
  (select public.erp_level('prospeccao')) in ('total','read')
  or ((select public.erp_level('prospeccao')) = 'own' and owner_id = (select auth.uid())));

drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select using (
  (select public.erp_level('crm')) in ('total','read')
  or ((select public.erp_level('crm')) = 'own' and (owner_id = (select auth.uid()) or owner_id is null)));

drop policy if exists activities_select on public.activities;
create policy activities_select on public.activities for select using (
  (select public.erp_level('crm')) in ('total','read')
  or ((select public.erp_level('crm')) = 'own' and owner_id = (select auth.uid())));

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients for select using (
  (select public.erp_level('clientes')) in ('total','read')
  or ((select public.erp_level('clientes')) = 'own' and owner_id = (select auth.uid())));

drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts for select using (
  (select public.erp_level('clientes')) in ('total','read')
  or ((select public.erp_level('clientes')) = 'own' and owner_id = (select auth.uid())));

-- 3) resumo da Captação (cabeçalho + painel "Ainda pela frente") — uma chamada só
create or replace function public.captacao_resumo() returns jsonb
language sql stable set search_path = public as $$
  with t as (
    select uf, city, done, leads_found from public.search_terms where archived_at is null
  ), u as (
    select uf, count(*) as total, count(*) filter (where done) as done, count(distinct public.captacao_fold(city)) as cities
      from t group by uf
  ), l as (
    select count(*) as total,
           count(*) filter (where search_term_id is not null) as captured,
           count(*) filter (where won_at is not null or client_id is not null) as wins,
           count(*) filter (where last_contact_at is not null or exists (
             select 1 from public.activities a where a.lead_id = x.id and a.type in ('whatsapp','ligacao','email','visita'))) as contacted
      from public.leads x where x.archived_at is null
  )
  select jsonb_build_object(
    'terms_total',   (select count(*) from t),
    'terms_done',    (select count(*) from t where done),
    'cities_done',   (select count(distinct (public.captacao_fold(city) || '|' || upper(coalesce(uf, '')))) from t where done),
    'yield_n',       (select count(*) from t where done and leads_found is not null),
    'yield_sum',     (select coalesce(sum(leads_found), 0) from t where done and leads_found is not null),
    'by_uf',         coalesce((select jsonb_agg(jsonb_build_object('uf', uf, 'total', total, 'done', done, 'cities', cities)) from u), '[]'::jsonb),
    'open_cities',   coalesce((select jsonb_agg(distinct jsonb_build_array(city, uf)) from t), '[]'::jsonb),
    'niches',        coalesce((select jsonb_agg(n order by n) from (
                        select niche as n from public.search_terms where archived_at is null
                        union
                        select niche from public.leads where archived_at is null) z where n is not null and n <> ''), '[]'::jsonb),
    'leads_total',     l.total,
    'leads_captured',  l.captured,
    'leads_wins',      l.wins,
    'leads_contacted', l.contacted
  ) from l
$$;

-- 4) locais de uma cidade para um nicho (aba "Nova captação")
create or replace function public.captacao_locais(p_uf text, p_city text, p_niche text) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'hoods', coalesce((
      select jsonb_agg(jsonb_build_object('neighborhood', h.neighborhood, 'region', h.region))
        from (select distinct on (public.captacao_fold(neighborhood)) neighborhood, region
                from public.search_terms
               where archived_at is null and uf = upper(p_uf) and public.captacao_fold(city) = public.captacao_fold(p_city)
               order by public.captacao_fold(neighborhood), (region is null), id) h), '[]'::jsonb),
    'mine', coalesce((
      select jsonb_agg(to_jsonb(m))
        from (select id, niche, neighborhood, city, uf, region, done, done_at, leads_found, batch_id, reserved_at
                from public.search_terms
               where archived_at is null and uf = upper(p_uf) and public.captacao_fold(city) = public.captacao_fold(p_city)
                 and public.captacao_fold(niche) = public.captacao_fold(p_niche)) m), '[]'::jsonb),
    'elsewhere', coalesce((
      select jsonb_agg(to_jsonb(e))
        from (select city, count(*) as total, count(*) filter (where done) as done
                from public.search_terms
               where archived_at is null and uf = upper(p_uf) and public.captacao_fold(niche) = public.captacao_fold(p_niche)
                 and public.captacao_fold(city) <> public.captacao_fold(p_city)
               group by city
              having count(*) filter (where done) < count(*)
               order by count(*) filter (where done) desc, city
               limit 12) e), '[]'::jsonb)
  )
$$;

-- 5) aba "Cobertura": já agrupa por nicho, cidade ou bairro conforme os filtros
create or replace function public.captacao_cobertura(p_uf text, p_city text, p_niche text) returns jsonb
language sql stable set search_path = public as $$
  with scope as (
    select t.id, t.niche, t.neighborhood, t.city, t.uf, t.done, t.done_at, t.batch_id,
           coalesce(nullif(lc.n, 0), t.leads_found, 0) as leads,
           coalesce(nullif(t.neighborhood, ''), '(cidade inteira)') as label
      from public.search_terms t
      left join (select search_term_id, count(*) as n from public.leads
                  where archived_at is null and search_term_id is not null group by 1) lc on lc.search_term_id = t.id
     where t.archived_at is null
       and (coalesce(p_uf, '') = '' or t.uf = upper(p_uf))
       and (coalesce(p_city, '') = '' or t.city = p_city)
       and (coalesce(p_niche, '') = '' or t.niche = p_niche)
  ), g as (
    select case when coalesce(p_niche, '') = '' then niche when coalesce(p_city, '') = '' then city else label end as key,
           count(*) as total,
           count(*) filter (where done) as done,
           sum(leads)::int as leads,
           count(distinct city) as cities,
           min(city) as one_city,
           min(uf) as uf,
           (array_agg(case when coalesce(p_niche, '') = '' and coalesce(p_city, '') = '' then label || ' (' || city || ')' else label end order by id)
              filter (where not done))[1:3] as next,
           max(done_at) as done_at,
           max(batch_id::text) as batch_id
      from scope group by 1
  )
  select jsonb_build_object(
    'rows',   coalesce((select jsonb_agg(to_jsonb(g)) from g), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(c) from (select distinct city as c from public.search_terms
                         where archived_at is null and (coalesce(p_uf, '') = '' or uf = upper(p_uf))) x), '[]'::jsonb),
    'niches', coalesce((select jsonb_agg(c) from (select distinct niche as c from public.search_terms
                         where archived_at is null and (coalesce(p_uf, '') = '' or uf = upper(p_uf))) x), '[]'::jsonb)
  )
$$;

grant execute on function public.captacao_resumo()                   to authenticated;
grant execute on function public.captacao_locais(text, text, text)    to authenticated;
grant execute on function public.captacao_cobertura(text, text, text) to authenticated;

analyze public.search_terms;
analyze public.leads;
analyze public.capture_batches;
analyze public.activities;

notify pgrst, 'reload schema';
