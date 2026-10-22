import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import Providers from '@/components/layout/Providers';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { MediaProvider } from '@/hooks/useMedia';
import { listarMidias } from '@/lib/media-server';
import { SITE } from '@/data/site';
import { media } from '@/data/media';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
// Substituta de "DT Getai Grotesk" (fonte da marca, arquivo não está no projeto).
const brand = Space_Grotesk({ subsets: ['latin'], variable: '--font-brand', display: 'swap', weight: ['500', '700'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'Zinkra | Tecnologia que faz o seu negócio vender mais', template: '%s | Zinkra' },
  description: SITE.descricao,
  applicationName: 'Zinkra',
  keywords: ['software house', 'criação de sites', 'landing page', 'sistema sob medida', 'ERP', 'PDV', 'SaaS', 'São Paulo'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE.url,
    siteName: 'Zinkra',
    title: 'Zinkra | Tecnologia que faz o seu negócio vender mais',
    description: SITE.descricao,
    images: [{ url: media.image.ogImage, width: 1200, height: 630, alt: 'Zinkra' }],
  },
  twitter: { card: 'summary_large_image', title: 'Zinkra', description: SITE.descricao, images: [media.image.ogImage] },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0A0C0B',
  width: 'device-width',
  initialScale: 1,
};

/** Dados estruturados da organização (Google). */
const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Zinkra',
  legalName: 'Zinkra Soluções Digitais',
  url: SITE.url,
  logo: `${SITE.url}/icon.svg`,
  description: SITE.descricao,
  email: SITE.email,
  telephone: '+5511941164044',
  taxID: SITE.cnpj,
  address: { '@type': 'PostalAddress', addressLocality: 'São Paulo', addressRegion: 'SP', addressCountry: 'BR' },
  sameAs: [SITE.instagramUrl],
  contactPoint: [{ '@type': 'ContactPoint', telephone: '+5511941164044', contactType: 'sales', areaServed: 'BR', availableLanguage: 'pt-BR' }],
};

/**
 * Roda antes da primeira pintura: aplica o tema salvo e marca a primeira visita
 * (para a tela de carregamento aparecer só uma vez e sem piscar).
 */
const bootScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('zk-theme');d.dataset.theme=t==='light'?'light':'dark';if(!localStorage.getItem('zk-visited')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){d.dataset.loader='on'}}catch(e){document.documentElement.dataset.theme='dark'}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const files = listarMidias();
  return (
    <html
      lang="pt-BR"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${brand.variable} ${files.includes('ruido.png') ? 'has-grain-file' : ''}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }} />
      </head>
      <body>
        <MediaProvider files={files}>
          <Providers>
            <Navbar />
            <main id="conteudo">{children}</main>
            <Footer />
            <div className="grain" aria-hidden />
          </Providers>
        </MediaProvider>
      </body>
    </html>
  );
}
