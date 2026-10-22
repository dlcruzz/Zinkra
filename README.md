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
