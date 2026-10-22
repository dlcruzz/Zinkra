import fs from 'node:fs';
import path from 'node:path';

/** Lista os arquivos que realmente existem em /public/media (roda no servidor, na hora do build). */
export function listarMidias(): string[] {
  try {
    return fs.readdirSync(path.join(process.cwd(), 'public', 'media'));
  } catch {
    return [];
  }
}
