import type { MetadataRoute } from 'next';
import { SITE } from '@/data/site';
import { projetos } from '@/data/projetos';
import { solucoes } from '@/data/solucoes';

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  const fixas = ['', '/sobre', '/projetos', '/contato', '/privacidade', '/termos'];
  return [
    ...fixas.map((p) => ({ url: `${SITE.url}${p}`, lastModified: agora, priority: p === '' ? 1 : 0.7 })),
    ...projetos.map((p) => ({ url: `${SITE.url}/projetos/${p.slug}`, lastModified: agora, priority: 0.6 })),
    ...solucoes.map((s) => ({ url: `${SITE.url}/solucoes/${s.slug}`, lastModified: agora, priority: 0.8 })),
  ];
}
