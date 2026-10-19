-- =====================================================================
-- ERP Zinkra — adiciona o papel "socio" (dados próprios em todos os módulos)
-- Rode este arquivo UMA VEZ no SQL Editor do Supabase.
-- Depois, no /erp/config → Usuários, troque o papel do colaborador
-- de "Diretor geral" para "Sócio". Daí ele passa a ver só os dados dele.
-- Você (diretor) continua vendo tudo, inclusive o que ele captar.
-- =====================================================================

insert into public.role_permissions (role, module, level) values
  -- socio: nível "own" em tudo que tem dono. Não enxerga dashboard,
  -- relatórios nem configurações da empresa.
  ('socio','dashboard','none'),
  ('socio','crm','own'),
  ('socio','prospeccao','own'),
  ('socio','metas','own'),
  ('socio','propostas','own'),
  ('socio','clientes','own'),
  ('socio','projetos','own'),
  ('socio','tarefas','own'),
  ('socio','reunioes','own'),
  ('socio','financeiro','own'),
  ('socio','parceiros','own'),
  ('socio','ideias','own'),
  ('socio','playbooks','read'),
  ('socio','relatorios','none'),
  ('socio','config','none')
on conflict (role, module) do update set level = excluded.level;
