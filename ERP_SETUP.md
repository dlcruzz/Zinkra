# ERP Zinkra — como colocar no ar

O ERP mora dentro do site, em **zinkra.com.br/erp**. O código está em `src/erp/`, o banco em `supabase/` e as funções de servidor em `api/erp-*.js`. Ele só é baixado quando alguém abre `/erp`, então não pesa no site.

## 1. Criar o banco (Supabase, plano gratuito)

1. Em [supabase.com](https://supabase.com), crie um projeto. Região: **South America (São Paulo)**. Guarde a senha do banco.
2. Abra **SQL Editor → New query**, cole o conteúdo de `supabase/erp-schema.sql` e clique em **Run**.
3. Nova query com `supabase/erp-seed.sql` → **Run**. Isso cria pipelines, catálogo de serviços com seus preços, templates de projeto, scripts M1/M2/V2/F1/A1/P1/R1, cobranças C1/C2 e a matriz nicho × bairro.
4. Nova query com `supabase/erp-captacao.sql` → **Run**. Isso liga a tela **Captação** (cidade/UF nos termos de busca e a tabela de lotes). Pode rodar de novo sem problema.
5. **Authentication → Sign In / Providers → Email**: deixe ativo e **desligue "Allow new users to sign up"**. Ninguém se cadastra sozinho.
6. **Authentication → URL Configuration**:
   - Site URL: `https://www.zinkra.com.br`
   - Redirect URLs: `https://www.zinkra.com.br/erp/**` e `http://localhost:5173/erp/**`

## 2. Criar o seu login (o primeiro vira Diretor)

**Authentication → Users → Add user → Create new user**, com seu e-mail e uma senha forte, marcando **Auto Confirm User**.

O **primeiro** usuário criado vira **Diretor geral** automaticamente. Os seguintes nascem "Aguardando liberação" até você escolher o papel em Configurações → Usuários.

## 3. Variáveis na Vercel

No projeto do site na Vercel: **Settings → Environment Variables** (Production e Preview):

| Variável | Onde pegar | Obrigatória |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | sim |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` | para convidar usuários pelo ERP |
| `ANTHROPIC_API_KEY` | console.anthropic.com | opcional, assistente da tela Inteligência |

A `service_role` **nunca** pode ter prefixo `VITE_` (iria para o navegador). Depois de salvar, faça **Redeploy**.

## 4. Rodar no seu PC

```bash
npm install
```

Crie `.env.local` na raiz (já está no `.gitignore`):

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

```bash
npm run dev
```

Abra `http://localhost:5173/erp`. Convite de usuário e assistente usam as funções de `api/`, que só rodam com `vercel dev` ou no ar.

## 5. Primeiro acesso (10 minutos)

1. **Minha conta → Ativar 2FA** com Google Authenticator ou similar. Depois disso o banco só libera dados com senha + código.
2. **Configurações → Empresa**: confira a chave Pix (vai nas mensagens de cobrança).
3. **Metas**: meta de faturamento mensal e as metas do prospector.
4. **Configurações → Usuários → Convidar**: e-mail do prospector, papel Prospector.
5. **Leads → Importar planilha**: exporte cada aba de captação da Zk planilhas como CSV (ou copie e cole as células) e importe. Duplicados por telefone/Instagram são detectados.
6. **Clientes → Novo cliente / Novo contrato** para os clientes atuais. Contratos mensais geram as cobranças sozinhos.
7. **Contas a pagar → Nova despesa** para as assinaturas recorrentes.

## Captação de clientes (Comercial → Captação)

1. Escolha nicho, estado e cidade. A tela mostra os bairros já buscados (verde), os que estão num lote esperando importação (amarelo) e os que faltam.
2. **Gerar prompt** já marca os próximos que faltam, cria o lote e copia o prompt. Cole no Claude (com a extensão do Chrome e o Google Maps).
3. O Claude devolve uma tabela TSV (ou arquivo .tsv/.xlsx). Em **Importar resultado**, cole ou suba o arquivo: o sistema tira duplicados (telefone/Instagram), cria os leads com nicho, cidade e bairro, e marca as buscas como feitas.
4. **Cobertura** mostra o que falta por nicho, cidade e bairro, e quais cidades do estado ainda não têm nenhuma busca.

Cidade nova sem bairros: busque a cidade inteira ou cole a lista de bairros (o botão "Prompt de bairros" gera o pedido para o Claude).

## O que o sistema faz sozinho

- Registrou contato → agenda follow-up (F1 em 3 dias; depois de 3 tentativas, R1 em 30 dias) e move o lead de etapa.
- Lead respondeu → vai para "Respondeu" e entra no topo da fila de hoje.
- Prospector passou ao Diretor → você recebe a tarefa "Conduzir proposta".
- Proposta enviada → lead vai para "Proposta enviada" com follow-up em 3 dias.
- Proposta aceita → cliente, contrato, parcelas, mensalidades, projetos com tarefas/checklist/marcos e comissão de parceiro.
- Contrato mensal e despesa recorrente → lançam os próximos meses sozinhos.
- Cliente pagou → comissão do parceiro vira conta a pagar.
- Tarefa recorrente concluída → cria a próxima.
- Tela **Inteligência** → lê tudo e aponta o que fazer: leads esfriando, propostas paradas, metas fora do ritmo, cobranças, projetos estourando horas, mês que vai fechar negativo, script que mais converte, nicho que mais fecha.

## Segurança

- Cadastro público desligado; papéis e permissões validados **no banco** (Row Level Security), não só na tela.
- Com 2FA ativo, um token só com senha não lê nenhum dado.
- Nada é apagado de vez: "Arquivar" esconde e o log de auditoria guarda quem fez o quê.
- `/erp` tem `noindex` e está no `robots.txt`.

## Backup (o plano gratuito não oferece backup baixável)

Uma vez por semana, com a connection string de **Project Settings → Database**:

```bash
pg_dump "postgresql://postgres:[SENHA]@db.[PROJETO].supabase.co:5432/postgres" -n public -F c -f backup-erp.dump
```

Confira os limites atuais do plano gratuito (tamanho do banco e pausa por inatividade). Com só metadados e uso diário, há folga grande.

## Mapa do código

| Arquivo | Para que serve |
|---|---|
| `src/erp/ErpApp.jsx` | Rotas, login com 2FA, telas de "sem acesso" |
| `src/erp/components/Shell.jsx` | Barra lateral, barra superior, busca Ctrl+K, criação rápida |
| `src/erp/lib/data.js` | Leitura e escrita no Supabase, recarga automática, mensagens |
| `src/erp/lib/automations.js` | Regras que trabalham por você (follow-up, proposta aceita, templates…) |
| `src/erp/lib/insights.js` | Motor de inteligência e prioridades |
| `src/erp/lib/world.js` | Cálculos de metas, caixa e fluxo |
| `src/erp/lib/captacao.js` | Locais (Brasil), prompt de captação para o Claude e leitura do resultado |
| `src/erp/pages/*` | Uma tela por arquivo |
| `supabase/erp-schema.sql` | Tabelas, permissões, gatilhos e automações do banco |
| `api/erp-ai.js` · `api/erp-invite.js` | Assistente com IA e convite de usuários (servidor) |
