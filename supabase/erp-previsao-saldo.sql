-- =====================================================================
-- ERP Zinkra — PREVISÃO DE RECEBER O SALDO DO PROJETO
-- Rode DEPOIS de erp-comandas.sql. Idempotente. Só adiciona uma coluna.
--
-- receber_previsto_em: quando o Danilo espera receber o que falta do projeto.
-- Com a data, o saldo entra em "A receber em 30 dias" e no saldo projetado
-- (quando a data cai nos próximos 30 dias) e aparece em Contas a receber.
-- =====================================================================

alter table public.project_comandas add column if not exists receber_previsto_em date;

notify pgrst, 'reload schema';
