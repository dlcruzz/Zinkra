-- =====================================================================
-- ERP Zinkra — dados iniciais
-- Rode depois de erp-schema.sql. Pode rodar de novo sem duplicar.
-- =====================================================================

-- Configurações gerais
insert into public.settings (key, value) values
  ('company', '{"name":"Zinkra","cnpj":"64.312.169/0001-60","pix":"64.312.169/0001-60","whatsapp":"(11) 94116-4044"}'),
  ('goals', '{"monthly_revenue_cents":1200000}'),
  ('lead_rules', '{"stale_days":7,"follow_up_days":3,"hot_reply_hours":24}'),
  ('niches', '["Dentista","Psicólogo","Fisioterapia","Nutrição","Estúdio","Barbearia","Clínica estética","Pet","Advocacia","Contabilidade"]'),
  ('neighborhoods', '["Moema","Pinheiros","Vila Mariana","Tatuapé","Santana","Lapa","Mooca","Perdizes","Ipiranga","Butantã","Penha","Vila Madalena","Itaim Bibi","Brooklin","Saúde","Jabaquara","Santo André","São Bernardo","Osasco","Guarulhos"]'),
  ('lost_reasons', '["Preço","Sem resposta","Já tem fornecedor","Não é o momento","Fechou com outro","Outro"]')
on conflict (key) do nothing;

-- Pipelines e etapas
insert into public.pipelines (name, slug, sort) values
  ('Prospecção fria', 'fria', 1),
  ('Vendas', 'vendas', 2),
  ('Indicações', 'indicacoes', 3),
  ('Upsell e pós-venda', 'upsell', 4)
on conflict (slug) do nothing;

do $$
declare
  p_fria uuid; p_vendas uuid; p_ind uuid; p_up uuid;
begin
  select id into p_fria   from public.pipelines where slug = 'fria';
  select id into p_vendas from public.pipelines where slug = 'vendas';
  select id into p_ind    from public.pipelines where slug = 'indicacoes';
  select id into p_up     from public.pipelines where slug = 'upsell';

  if not exists (select 1 from public.pipeline_stages where pipeline_id = p_fria) then
    insert into public.pipeline_stages (pipeline_id, name, sort, probability, kind, color, follow_up_days) values
      (p_fria, 'Novo', 1, 2, 'open', '#8A938E', null),
      (p_fria, 'Contatado', 2, 5, 'open', '#8AB2FF', 3),
      (p_fria, 'Respondeu', 3, 15, 'open', '#F0C04A', 1),
      (p_fria, 'Reunião agendada', 4, 35, 'open', '#3FDD7C', null),
      (p_fria, 'Passado ao Diretor', 5, 50, 'handoff', '#15C45A', null),
      (p_fria, 'Perdido', 6, 0, 'lost', '#FF7A7D', null);
  end if;
  if not exists (select 1 from public.pipeline_stages where pipeline_id = p_vendas) then
    insert into public.pipeline_stages (pipeline_id, name, sort, probability, kind, color, follow_up_days) values
      (p_vendas, 'Reunião feita', 1, 40, 'open', '#8AB2FF', 2),
      (p_vendas, 'Proposta enviada', 2, 55, 'open', '#F0C04A', 3),
      (p_vendas, 'Negociação', 3, 70, 'open', '#E5A23A', 2),
      (p_vendas, 'Ganho', 4, 100, 'won', '#15C45A', null),
      (p_vendas, 'Perdido', 5, 0, 'lost', '#FF7A7D', null);
  end if;
  if not exists (select 1 from public.pipeline_stages where pipeline_id = p_ind) then
    insert into public.pipeline_stages (pipeline_id, name, sort, probability, kind, color, follow_up_days) values
      (p_ind, 'Indicado', 1, 20, 'open', '#8A938E', 1),
      (p_ind, 'Contatado', 2, 35, 'open', '#8AB2FF', 3),
      (p_ind, 'Proposta', 3, 60, 'open', '#F0C04A', 3),
      (p_ind, 'Ganho', 4, 100, 'won', '#15C45A', null),
      (p_ind, 'Perdido', 5, 0, 'lost', '#FF7A7D', null);
  end if;
  if not exists (select 1 from public.pipeline_stages where pipeline_id = p_up) then
    insert into public.pipeline_stages (pipeline_id, name, sort, probability, kind, color, follow_up_days) values
      (p_up, 'Oportunidade', 1, 30, 'open', '#8AB2FF', 7),
      (p_up, 'Proposta', 2, 60, 'open', '#F0C04A', 3),
      (p_up, 'Ganho', 3, 100, 'won', '#15C45A', null),
      (p_up, 'Perdido', 4, 0, 'lost', '#FF7A7D', null);
  end if;
end $$;

-- Categorias de despesa
insert into public.categories (kind, name, sort) values
  ('expense','Ferramentas e assinaturas',1),('expense','Impostos',2),('expense','Freelancers',3),
  ('expense','Marketing',4),('expense','Comissões',5),('expense','Equipamentos',6),('expense','Outros',7)
on conflict (kind, name) do nothing;

-- Templates de projeto
do $$
declare t uuid;
begin
  if not exists (select 1 from public.project_templates) then
    insert into public.project_templates (name, front, est_hours, duration_days) values ('Site Basic', 'sites', 10, 10) returning id into t;
    insert into public.template_items (template_id, kind, title, offset_days, est_minutes, sort) values
      (t,'task','Reunião de briefing',0,60,1),(t,'task','Receber textos e fotos do cliente',2,null,2),
      (t,'task','Layout da página',3,180,3),(t,'task','Desenvolvimento',5,240,4),(t,'task','Revisão com o cliente',8,60,5),
      (t,'task','Publicação',10,60,6),
      (t,'checklist','Domínio registrado e apontado',0,null,1),(t,'checklist','Responsivo testado',0,null,2),
      (t,'checklist','Botão de WhatsApp com mensagem pronta',0,null,3),(t,'checklist','Acessos entregues ao cliente',0,null,4),
      (t,'milestone','Layout aprovado',4,null,1),(t,'milestone','Publicação',10,null,2);

    insert into public.project_templates (name, front, est_hours, duration_days) values ('Site Plus', 'sites', 20, 21) returning id into t;
    insert into public.template_items (template_id, kind, title, offset_days, est_minutes, sort) values
      (t,'task','Reunião de briefing',0,60,1),(t,'task','Receber textos e fotos do cliente',3,null,2),
      (t,'task','Layout no Figma',5,300,3),(t,'task','Home e hero',8,240,4),(t,'task','Páginas internas',12,480,5),
      (t,'task','SEO básico',16,90,6),(t,'task','Revisão com o cliente',18,60,7),(t,'task','Ajustes finais',19,120,8),
      (t,'task','Publicação e entrega de acessos',21,60,9),
      (t,'checklist','Domínio registrado e apontado',0,null,1),(t,'checklist','Layout aprovado pelo cliente',0,null,2),
      (t,'checklist','Responsivo testado (celular, tablet, desktop)',0,null,3),(t,'checklist','Textos finais recebidos',0,null,4),
      (t,'checklist','Botão de WhatsApp com mensagem pronta',0,null,5),(t,'checklist','SEO básico (títulos, descrições, sitemap)',0,null,6),
      (t,'checklist','Formulário testado de ponta a ponta',0,null,7),(t,'checklist','Google Analytics instalado',0,null,8),
      (t,'checklist','Acessos entregues ao cliente',0,null,9),
      (t,'milestone','Briefing e contrato assinado',0,null,1),(t,'milestone','Layout aprovado',7,null,2),
      (t,'milestone','Versão para revisão do cliente',17,null,3),(t,'milestone','Publicação',21,null,4);

    insert into public.project_templates (name, front, est_hours, duration_days) values ('Site Premium', 'sites', 40, 35) returning id into t;
    insert into public.template_items (template_id, kind, title, offset_days, est_minutes, sort) values
      (t,'task','Reunião de briefing',0,90,1),(t,'task','Arquitetura de páginas',3,180,2),(t,'task','Layout no Figma',7,600,3),
      (t,'task','Desenvolvimento',14,1200,4),(t,'task','Otimização de performance',26,240,5),(t,'task','SEO avançado',28,240,6),
      (t,'task','Revisão com o cliente',30,90,7),(t,'task','Publicação',35,60,8),
      (t,'checklist','Domínio e e-mails configurados',0,null,1),(t,'checklist','Nota de performance acima de 90',0,null,2),
      (t,'checklist','Acessos entregues ao cliente',0,null,3),
      (t,'milestone','Layout aprovado',10,null,1),(t,'milestone','Publicação',35,null,2);

    insert into public.project_templates (name, front, est_hours, duration_days) values ('Social Media mensal', 'social', 8, 30) returning id into t;
    insert into public.template_items (template_id, kind, title, offset_days, est_minutes, sort) values
      (t,'task','Planejamento de pautas do mês',0,90,1),(t,'task','Produção das artes',5,240,2),
      (t,'task','Aprovação do cliente',8,null,3),(t,'task','Agendamento das publicações',10,60,4),(t,'task','Relatório do mês',29,60,5);

    insert into public.project_templates (name, front, est_hours, duration_days) values ('Sistema sob medida', 'sistemas', 120, 60) returning id into t;
    insert into public.template_items (template_id, kind, title, offset_days, est_minutes, sort) values
      (t,'task','Levantamento de requisitos',0,240,1),(t,'task','Modelagem do banco',5,240,2),(t,'task','Protótipo de telas',10,600,3),
      (t,'task','Desenvolvimento do back-end',15,2400,4),(t,'task','Desenvolvimento do front-end',25,2400,5),
      (t,'task','Testes com o cliente',50,240,6),(t,'task','Implantação',58,240,7),(t,'task','Treinamento',60,120,8),
      (t,'milestone','Requisitos aprovados',5,null,1),(t,'milestone','Protótipo aprovado',14,null,2),
      (t,'milestone','Versão de testes',50,null,3),(t,'milestone','Implantação',60,null,4);
  end if;
end $$;

-- Catálogo de serviços (preços atuais da Zinkra)
do $$
begin
  if not exists (select 1 from public.services) then
    insert into public.services (name, front, min_cents, max_cents, billing, includes, template_id, sort) values
      ('Site Basic','sites',57000,90000,'once','1 página, mobile-first',(select id from public.project_templates where name='Site Basic'),1),
      ('Site Plus','sites',115000,180000,'once','até 5 páginas, SEO básico',(select id from public.project_templates where name='Site Plus'),2),
      ('Site Premium','sites',230000,400000,'once','completo, performance avançada',(select id from public.project_templates where name='Site Premium'),3),
      ('E-commerce','sites',450000,900000,'once','loja completa',(select id from public.project_templates where name='Site Premium'),4),
      ('Social Media Basic','social',22700,22700,'monthly','8 posts por mês',(select id from public.project_templates where name='Social Media mensal'),5),
      ('Social Media Plus','social',45700,45700,'monthly','12 posts + reels',(select id from public.project_templates where name='Social Media mensal'),6),
      ('Social Media Premium','social',79700,79700,'monthly','20+ conteúdos e vídeos',(select id from public.project_templates where name='Social Media mensal'),7),
      ('Sistema sob medida','sistemas',0,0,'once','sob orçamento',(select id from public.project_templates where name='Sistema sob medida'),8),
      ('Manutenção mensal','sistemas',0,0,'monthly','suporte e ajustes',null,9),
      ('Tráfego pago','trafego',0,0,'monthly','gestão de campanhas',null,10);
  end if;
end $$;

-- Playbooks iniciais (scripts de prospecção)
do $$
begin
  if not exists (select 1 from public.playbooks) then
    insert into public.playbooks (collection, niche, code, title, when_to_use, body) values
      ('Prospecção', null, 'M1', 'Mensagem única com oferta', 'primeiro contato frio',
       E'Oi, tudo bem? Sou o Danilo, da Zinkra. Vi que a [EMPRESA] ainda não tem site, e quem procura [NICHO] em [BAIRRO] no Google acaba indo para a concorrência.\nFazemos sites a partir de R$ 570, prontos em poucos dias e pensados para o celular. Se fizer sentido, te mostro exemplos e um orçamento por aqui mesmo.'),
      ('Prospecção', null, 'M2', 'Mensagem única para quem já tem site', 'primeiro contato, site desatualizado',
       E'Oi, tudo bem? Sou o Danilo, da Zinkra. Passei pelo site da [EMPRESA] e ele não abre bem no celular, que é de onde vem a maioria dos clientes hoje.\nRefazemos sites com foco em contato pelo WhatsApp, a partir de R$ 1.150. Se quiser, te mando exemplos e um orçamento por aqui.'),
      ('Prospecção', null, 'V2', 'Análise gratuita do perfil', 'lead respondeu com interesse',
       E'Que bom, [NOME]! Segue a análise do perfil da [EMPRESA] com 3 pontos que fariam mais clientes chegarem pelo Instagram e pelo Google.\nSe quiser, marcamos 15 minutos para eu te mostrar como ficaria o site.'),
      ('Prospecção', null, 'F1', 'Follow-up de 3 dias', '3 dias sem resposta',
       E'Oi [NOME], passando só para saber se você viu minha mensagem sobre o site da [EMPRESA]. Se agora não for o momento, sem problema, é só me avisar.'),
      ('Prospecção', null, 'A1', 'Encaminhamento para quem decide', 'quem respondeu não decide',
       E'Obrigado pelo retorno! Você consegue encaminhar esta mensagem para o responsável? É uma proposta rápida de site para a [EMPRESA], com exemplos de outros clientes.'),
      ('Objeções', null, 'P1', 'Objeção de preço', 'lead acha caro',
       E'Entendo, [NOME]. Dá para começar pelo Site Basic, de uma página, e evoluir depois. Também parcelamos em até 3 vezes. Quer que eu te mande essa opção?'),
      ('Prospecção', null, 'R1', 'Reativação após 30 dias', 'lead frio há mais de 30 dias',
       E'Oi [NOME], tudo bem? Voltando aqui porque abrimos 2 vagas para sites em [MES]. Se ainda fizer sentido para a [EMPRESA], te mando os detalhes.'),
      ('Cobrança', null, 'C1', 'Lembrete de vencimento', 'dois dias antes do vencimento',
       E'Olá, [NOME]! Passando para lembrar da cobrança de [DESCRICAO], no valor de [VALOR], com vencimento em [DATA].\nChave Pix (CNPJ): [PIX] · Zinkra\nQualquer dúvida, estou por aqui. Obrigado!'),
      ('Cobrança', null, 'C2', 'Cobrança vencida', 'parcela vencida',
       E'Oi, [NOME], tudo bem? A cobrança de [DESCRICAO], de [VALOR], venceu em [DATA]. Consegue verificar para mim? A chave Pix é [PIX]. Obrigado!');
  end if;
end $$;

-- Matriz de termos de busca (nicho × bairro) a partir das listas acima
insert into public.search_terms (niche, neighborhood, owner_id)
select n.value #>> '{}', b.value #>> '{}', null
  from jsonb_array_elements((select value from public.settings where key = 'niches')) n,
       jsonb_array_elements((select value from public.settings where key = 'neighborhoods')) b
on conflict (niche, neighborhood) do nothing;
