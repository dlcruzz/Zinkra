-- ============================================================================
-- ERP Zinkra · Captação de clientes (rodar UMA vez no Supabase → SQL Editor)
-- Pode rodar de novo sem problema: tudo aqui é idempotente.
-- ============================================================================

-- 1) Termos de busca passam a ter cidade, UF e região (antes era só "bairro")
alter table public.search_terms add column if not exists city        text not null default 'São Paulo';
alter table public.search_terms add column if not exists uf          text not null default 'SP';
alter table public.search_terms add column if not exists region      text;
alter table public.search_terms add column if not exists leads_found integer;
alter table public.search_terms add column if not exists batch_id    uuid;
alter table public.search_terms add column if not exists reserved_at timestamptz;

-- a chave única antiga (nicho + bairro) impediria o mesmo bairro em cidades diferentes
alter table public.search_terms drop constraint if exists search_terms_niche_neighborhood_key;

-- Grande SP: na planilha esses "bairros" eram, na verdade, cidades
update public.search_terms set city = neighborhood, neighborhood = ''
 where uf = 'SP' and city = 'São Paulo' and neighborhood in (
  'Guarulhos','Osasco','Santo André','São Bernardo do Campo','São Caetano do Sul','Diadema','Mauá','Barueri',
  'Carapicuíba','Cotia','Itapevi','Taboão da Serra','Embu das Artes','Ferraz de Vasconcelos','Suzano',
  'Mogi das Cruzes','Itaquaquecetuba','Franco da Rocha','Caieiras','Poá','Jandira','Itapecerica da Serra',
  'Embu-Guaçu','Arujá','Mairiporã','Santana de Parnaíba','Ribeirão Pires','Rio Grande da Serra','Francisco Morato');
update public.search_terms set city = 'Barueri', neighborhood = 'Alphaville'
 where city = 'São Paulo' and neighborhood = 'Alphaville (Barueri)'
   and not exists (select 1 from public.search_terms s2 where s2.niche = search_terms.niche and s2.city = 'Barueri' and s2.neighborhood = 'Alphaville');
update public.search_terms set neighborhood = 'Sé' where city = 'São Paulo' and neighborhood = 'Sé (Centro)'
   and not exists (select 1 from public.search_terms s2 where s2.niche = search_terms.niche and s2.city = 'São Paulo' and s2.neighborhood = 'Sé');

-- remove duplicados que a mudança possa ter criado (fica o que já estava feito)
delete from public.search_terms a using public.search_terms b
 where a.niche = b.niche and a.neighborhood = b.neighborhood and a.city = b.city and a.uf = b.uf
   and a.id <> b.id and (a.done, a.id::text) < (b.done, b.id::text)
   and not exists (select 1 from public.leads l where l.search_term_id = a.id);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'search_terms_loc_key') then
    alter table public.search_terms add constraint search_terms_loc_key unique (niche, neighborhood, city, uf);
  end if;
end $$;
create index if not exists search_terms_city_idx on public.search_terms(uf, city);

-- região (zona) dos bairros de São Paulo
update public.search_terms t set region = z.region from (values
  ('Santana','Zona Norte'),('Tucuruvi','Zona Norte'),('Vila Maria','Zona Norte'),('Casa Verde','Zona Norte'),
  ('Freguesia do Ó','Zona Norte'),('Pirituba','Zona Norte'),('Jaçanã','Zona Norte'),('Mandaqui','Zona Norte'),
  ('Vila Guilherme','Zona Norte'),('Limão','Zona Norte'),('Jaraguá','Zona Norte'),
  ('Santo Amaro','Zona Sul'),('Campo Belo','Zona Sul'),('Moema','Zona Sul'),('Vila Mariana','Zona Sul'),
  ('Jabaquara','Zona Sul'),('Interlagos','Zona Sul'),('Cidade Ademar','Zona Sul'),('Capela do Socorro','Zona Sul'),
  ('Campo Limpo','Zona Sul'),('Grajaú','Zona Sul'),('Cidade Dutra','Zona Sul'),('Itaim Bibi','Zona Sul'),
  ('Vila Olímpia','Zona Sul'),('Brooklin','Zona Sul'),('Saúde','Zona Sul'),('Ipiranga','Zona Sul'),
  ('Sacomã','Zona Sul'),('Chácara Klabin','Zona Sul'),('Capão Redondo','Zona Sul'),('Jardim Ângela','Zona Sul'),
  ('Morumbi','Zona Sul'),('Cidade Jardim','Zona Sul'),('Real Parque','Zona Sul'),('Jardins','Zona Sul'),('Jardim Paulista','Zona Sul'),
  ('Tatuapé','Zona Leste'),('Mooca','Zona Leste'),('Penha','Zona Leste'),('Itaquera','Zona Leste'),
  ('São Miguel Paulista','Zona Leste'),('Vila Prudente','Zona Leste'),('Aricanduva','Zona Leste'),('Vila Formosa','Zona Leste'),
  ('Sapopemba','Zona Leste'),('Cidade Tiradentes','Zona Leste'),('Guaianases','Zona Leste'),('Itaim Paulista','Zona Leste'),
  ('São Mateus','Zona Leste'),('Vila Carrão','Zona Leste'),('Vila Matilde','Zona Leste'),
  ('Pinheiros','Zona Oeste'),('Lapa','Zona Oeste'),('Butantã','Zona Oeste'),('Perdizes','Zona Oeste'),
  ('Vila Leopoldina','Zona Oeste'),('Alto de Pinheiros','Zona Oeste'),('Rio Pequeno','Zona Oeste'),('Vila Sônia','Zona Oeste'),
  ('Vila Madalena','Zona Oeste'),('Pompeia','Zona Oeste'),('Barra Funda','Zona Oeste'),('Jaguaré','Zona Oeste'),('Raposo Tavares','Zona Oeste'),
  ('Sé','Centro'),('Bela Vista','Centro'),('Liberdade','Centro'),('Consolação','Centro'),('Santa Cecília','Centro'),
  ('República','Centro'),('Bom Retiro','Centro'),('Higienópolis','Centro'),('Aclimação','Centro'),('Cambuci','Centro')
) as z(hood, region)
where t.city = 'São Paulo' and t.uf = 'SP' and t.neighborhood = z.hood and t.region is null;

-- 2) Leads guardam a UF; os da Grande SP ganham a cidade certa
alter table public.leads add column if not exists uf text;
update public.leads set city = neighborhood, neighborhood = null
 where coalesce(city, 'São Paulo') = 'São Paulo' and neighborhood in (
  'Guarulhos','Osasco','Santo André','São Bernardo do Campo','São Caetano do Sul','Diadema','Mauá','Barueri',
  'Carapicuíba','Cotia','Itapevi','Taboão da Serra','Embu das Artes','Ferraz de Vasconcelos','Suzano',
  'Mogi das Cruzes','Itaquaquecetuba','Franco da Rocha','Caieiras','Poá','Jandira','Itapecerica da Serra',
  'Embu-Guaçu','Arujá','Mairiporã','Santana de Parnaíba','Ribeirão Pires','Rio Grande da Serra','Francisco Morato');
update public.leads set uf = 'SP' where uf is null and (city is null or city in (
  'São Paulo','Guarulhos','Osasco','Santo André','São Bernardo do Campo','São Caetano do Sul','Diadema','Mauá','Barueri',
  'Carapicuíba','Cotia','Itapevi','Taboão da Serra','Embu das Artes','Ferraz de Vasconcelos','Suzano',
  'Mogi das Cruzes','Itaquaquecetuba','Franco da Rocha','Caieiras','Poá','Jandira','Itapecerica da Serra',
  'Embu-Guaçu','Arujá','Mairiporã','Santana de Parnaíba','Ribeirão Pires','Rio Grande da Serra','Francisco Morato'));

-- 3) Lotes de captação (cada prompt gerado vira um lote)
create table if not exists public.capture_batches (
  id            uuid primary key default gen_random_uuid(),
  code          text not null,
  niche         text not null,
  city          text not null,
  uf            text not null,
  terms         jsonb not null default '[]',   -- [{id, neighborhood, query}]
  only_no_site  boolean not null default true,
  prompt        text,
  status        text not null default 'aguardando' check (status in ('aguardando','importado','cancelado')),
  leads_created integer not null default 0,
  leads_dup     integer not null default 0,
  imported_at   timestamptz,
  owner_id      uuid default auth.uid() references public.profiles(id),
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  archived_at   timestamptz
);
create index if not exists capture_batches_status_idx on public.capture_batches(status);

alter table public.capture_batches enable row level security;
drop policy if exists capture_batches_select on public.capture_batches;
drop policy if exists capture_batches_insert on public.capture_batches;
drop policy if exists capture_batches_update on public.capture_batches;
drop policy if exists capture_batches_delete on public.capture_batches;
create policy capture_batches_select on public.capture_batches for select using (
  public.erp_level('prospeccao') in ('total','read') or (public.erp_level('prospeccao') = 'own' and owner_id = auth.uid()));
create policy capture_batches_insert on public.capture_batches for insert with check (
  public.erp_level('prospeccao') = 'total' or (public.erp_level('prospeccao') = 'own' and owner_id = auth.uid()));
create policy capture_batches_update on public.capture_batches for update using (
  public.erp_level('prospeccao') = 'total' or (public.erp_level('prospeccao') = 'own' and owner_id = auth.uid()))
  with check (public.erp_level('prospeccao') = 'total' or (public.erp_level('prospeccao') = 'own' and owner_id = auth.uid()));
create policy capture_batches_delete on public.capture_batches for delete using (public.erp_level('prospeccao') = 'total');

-- prospector com acesso "próprio" também pode criar termos novos (bairros/cidades novas)
drop policy if exists terms_insert_any on public.search_terms;
create policy terms_insert_any on public.search_terms for insert with check (public.erp_level('prospeccao') in ('total','own'));

grant select, insert, update, delete on public.capture_batches to authenticated;

-- updated_at automático
drop trigger if exists trg_touch on public.capture_batches;
create trigger trg_touch before update on public.capture_batches for each row execute function public.touch_updated_at();

notify pgrst, 'reload schema';
