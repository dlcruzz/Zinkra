# Zinkra — site institucional

Next.js 15 (App Router) + TypeScript + Tailwind 3 · GSAP + Lenis + Framer Motion · Three.js (React Three Fiber).

```bash
npm install
cp .env.example .env.local   # preencha RESEND_API_KEY
npm run dev                  # http://localhost:3000
npm run build && npm start
```

- Mídias: coloque os arquivos em `public/media/` com os nomes listados em `src/data/media.ts`. Sem arquivo, o site mostra um fundo de reserva.
- Textos e dados: `src/data/` (projetos, soluções, números `// PREENCHER`, novidades).
- ERP: app Vite em `erp-app/`, gerado em `public/erp` pelo build e servido em `/erp`. Funções do ERP em `src/pages/api/`. Variáveis em `.env.example`.
- Site antigo (Vite): branch `backup-site-antigo`.

## ERP — financeiro dos projetos e conciliação bancária

Ordem dos arquivos SQL no Supabase (SQL Editor, um por vez): `supabase/remover-modulo-pessoal.sql` → `supabase/erp-financeiro-projetos.sql` → `supabase/erp-banco.sql`.

Importação por arquivo (OFX/CSV do app do Nubank) funciona sem configurar nada. A conexão automática via Pluggy é opcional e usa variáveis de ambiente **só no servidor**. Cadastre na Vercel em *Project → Settings → Environment Variables* (Production e Preview), depois faça Redeploy:

| Variável | Onde pegar |
|---|---|
| `PLUGGY_CLIENT_ID` | painel do Pluggy → sua aplicação → Client ID |
| `PLUGGY_CLIENT_SECRET` | painel do Pluggy → sua aplicação → Client Secret |
| `PLUGGY_ITEM_ID` | id da conexão (item) criada ao autorizar o Nu Empresas pelo widget do Pluggy |

Nunca coloque esses valores no código, no `.env` versionado ou com prefixo `VITE_` (iria para o navegador). A rota `src/pages/api/banco-pluggy.js` só responde ao Diretor geral.

Testes: `npm test`. Build: `npm run build`.
