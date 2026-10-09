# Captação automática pelo Google (sem Claude)

## 1. Problema
A captação de leads era feita pelo Claude no Chrome, abrindo o Google Maps card por card. Isso gasta muito token, é lento (minutos por bairro) e depende de uma conversa aberta.

## 2. Objetivo
O próprio ERP busca os estabelecimentos no Google e entrega a lista pronta para importar, no mesmo fluxo de hoje (lote, deduplicação, cobertura de bairros), sem usar o Claude.

## 3. Requisitos funcionais
| # | Requisito |
|---|---|
| RF1 | Na Captação → Nova captação, com fonte "Google Maps", o botão **Captar automático** busca cada bairro marcado no Google. |
| RF2 | Cada busca usa o mesmo termo do prompt: `"<Nicho> em <Bairro>, <Cidade> - <UF>"`. |
| RF3 | Traz até 60 lugares por bairro (3 páginas de 20). |
| RF4 | Para cada lugar: nome, telefone, site, @ do Instagram (quando o site cadastrado é o Instagram), bairro, endereço, link do Maps. |
| RF5 | Ignora estabelecimentos fechados (temporária ou definitivamente). |
| RF6 | Classifica "tem site próprio": link de rede social, Linktree, WhatsApp, Doctoralia, iFood etc. conta como **sem site**. |
| RF7 | O resultado abre direto na tela de importação, com a mesma análise de hoje: novos, já no CRM, com site, sem contato. |
| RF8 | Busca sem resultado entra como "SEM RESULTADOS", para o bairro ser marcado como feito. |
| RF9 | Mostra o progresso (busca X de Y, lugares encontrados, chamadas ao Google). |
| RF10 | Conta as chamadas do mês e avisa antes de passar da cota grátis. |
| RF11 | Se a chave do Google não estiver configurada, o botão some e o prompt continua funcionando como antes. |
| RF12 | O Instagram continua pelo prompt (não existe API pública para isso). |

## 4. Requisitos não funcionais
- **Segurança:** a chave do Google fica só no servidor (função da Vercel), nunca no navegador. A função só responde para usuário logado e ativo no ERP.
- **Custo:** cada página de 20 resultados é 1 chamada "Text Search Enterprise" (telefone e site são campos Enterprise). Cota grátis mensal do Google: 1.000 chamadas, cerca de 20 mil lugares. Acima disso, cerca de US$ 35 por 1.000 chamadas.
- **Proteção de custo:** limite diário de chamadas configurado no Google Cloud (Cotas), além do aviso do ERP.
- **Desempenho:** cerca de 1 a 3 segundos por bairro, contra minutos com o Claude.

## 5. Arquitetura
```
Captação (React)  --POST /api/places-search {query}-->  Função Vercel  --Places API (New) searchText-->  Google
      ^                                                       |
      |------------------ linhas no formato da captação ------|
      v
Importação (mesma de hoje)  -->  Supabase (leads, search_terms, capture_batches)
```
- `api/places-search.js`: confere a sessão no Supabase, chama `places:searchText` com `X-Goog-FieldMask` mínimo, pagina com `nextPageToken`, converte para as colunas da captação.
- `GET /api/places-search` responde `{ configured }` para o ERP saber se mostra o botão.
- Uso do mês salvo em `settings.places_usage = { month, calls }`.

## 6. Como ligar (uma vez)
1. Google Cloud Console → criar projeto → **Ativar "Places API (New)"**.
2. Faturamento: vincular um cartão (o Google exige, mesmo dentro da cota grátis).
3. Credenciais → Criar chave de API → restringir a chave à "Places API (New)".
4. Cotas da Places API → limitar as chamadas por dia (ex.: 100/dia), para nunca passar da cota grátis.
5. Vercel → Settings → Environment Variables → `GOOGLE_PLACES_KEY` = a chave → Redeploy.

## 7. Atenção aos termos do Google
Os termos da Google Maps Platform limitam guardar o conteúdo da API (só o `place_id` pode ficar guardado sem prazo). Usar os dados para contato comercial e guardar em CRM é zona cinzenta nesses termos. As plataformas que "captam do Maps" geralmente fazem raspagem por conta própria ou revendem dados (Outscraper, Apify), e isso também fere os termos do Google. A API oficial é o caminho mais estável e com menos risco de bloqueio.
