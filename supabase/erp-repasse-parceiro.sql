-- =====================================================================
-- ERP Zinkra — QUANTO FOI REPASSADO AO PARCEIRO EM CADA RECEBIMENTO
-- Rode no SQL Editor do Supabase. Idempotente: pode rodar de novo.
-- Só ADICIONA duas colunas; não muda nenhum valor que já existe.
--
-- Ideia: quando o cliente paga uma parte e você repassa uma parte ao parceiro na hora
-- (ex.: entrou R$ 1.110, mandou R$ 550 ao André e ficou com R$ 560), o recebimento guarda
-- o que foi repassado. As caixinhas dividem só o que ficou com você (R$ 560).
--   comissao_cents          NULL = como antes (proporção automática); número = o que foi repassado de verdade
--   comissao_pagamento_id   o pagamento de comissão criado junto (para o André ver o que recebeu)
-- =====================================================================

alter table public.project_recebimentos add column if not exists comissao_cents bigint;
alter table public.project_recebimentos drop constraint if exists project_recebimentos_comissao_ck;
alter table public.project_recebimentos add  constraint project_recebimentos_comissao_ck check (comissao_cents is null or comissao_cents >= 0);
alter table public.project_recebimentos add column if not exists comissao_pagamento_id uuid references public.project_comissao_pagamentos(id) on delete set null;

notify pgrst, 'reload schema';
