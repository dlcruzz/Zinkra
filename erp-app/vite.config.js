import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

// O ERP é gerado como arquivos estáticos em public/erp e servido pelo Next em /erp.
export default defineConfig({
  root,
  base: '/erp/',
  plugins: [react()],
  // variáveis VITE_SUPABASE_* ficam no .env da raiz do projeto
  envDir: path.resolve(root, '..'),
  build: { outDir: path.resolve(root, '../public/erp'), emptyOutDir: true },
  server: { port: 5174 },
})
