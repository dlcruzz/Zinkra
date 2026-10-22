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
- Site antigo (Vite + ERP + API): branch `backup-site-antigo`.
