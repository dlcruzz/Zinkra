-- =====================================================================
-- ERP Zinkra — TIPO "DESCONTO" nos itens da comanda
-- Rode DEPOIS de erp-comandas.sql. Idempotente: pode rodar de novo.
-- Só mexe na regra de tipos aceitos: não apaga tabela, coluna nem linha.
--
-- O desconto é guardado como valor positivo e ABATE o total do projeto
-- (a conta fica em supabase/../erp-app/src/erp/lib/financeiro.js).
-- =====================================================================

alter table public.project_valores drop constraint if exists project_valores_kind_check;
alter table public.project_valores add  constraint project_valores_kind_check
  check (kind in ('base','adicional','melhoria','mensalidade','desconto'));

notify pgrst, 'reload schema';
