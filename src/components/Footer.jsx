import React from 'react'
import { Link } from 'react-router-dom'

const SERVICE_LINKS = [
  { label: 'Criação de Sites',    href: '/servicos#sites'    },
  { label: 'Redes Sociais',       href: '/servicos#social'   },
  { label: 'Sistemas Sob Medida', href: '/servicos#sistemas' },
  { label: 'IA e Automação',      href: '/servicos'          },
  { label: 'SEO e Google',        href: '/servicos'          },
  { label: 'Identidade Visual',   href: '/identidade-visual' },
  { label: 'SaaS',                href: '/saas'              },
]

const NAV_LINKS = [
  { label: 'Início',            to: '/'                  },
  { label: 'Serviços',          to: '/servicos'          },
  { label: 'Projetos',          to: '/projetos'          },
  { label: 'SaaS',              to: '/saas'              },
  { label: 'Blog',              to: '/blog'              },
  { label: 'Sobre',             to: '/sobre'             },
  { label: 'Contato',           to: '/contato'           },
  { label: 'Identidade Visual', to: '/identidade-visual' },
]

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function ColHeading({ children }) {
  return <p className="font-bold text-white text-[15px] mb-5">{children}</p>
}

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#071209' }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Col 1 — Brand */}
          <div>
            <div className="mb-4">
              <Link to="/" aria-label="Zinkra — início">
                <img
                  src="/images/logo-branco.png"
                  alt="Zinkra"
                  className="h-9 w-auto"
                />
              </Link>
            </div>
            <p className="text-[14px] leading-[1.7] mb-7" style={{ color: '#5A7A65' }}>
              Soluções personalizadas para transformar e maximizar a presença digital da sua empresa.
            </p>
            <div className="flex items-center gap-4">
              {[
                { href: 'https://instagram.com/zinkra.dev', Icon: InstagramIcon, label: 'Instagram' },
                { href: '#',                                 Icon: LinkedInIcon,  label: 'LinkedIn'  },
                { href: 'https://wa.me/5511941164044',       Icon: WhatsAppIcon,  label: 'WhatsApp'  },
              ].map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                  style={{ backgroundColor: 'rgba(21,196,90,0.1)', color: '#5A7A65' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(21,196,90,0.2)'; e.currentTarget.style.color = '#15C45A' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(21,196,90,0.1)'; e.currentTarget.style.color = '#5A7A65' }}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 — Links Úteis */}
          <div>
            <ColHeading>Links Úteis</ColHeading>
            <ul className="space-y-3">
              {NAV_LINKS.map(l => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-[14px] transition-colors duration-200"
                    style={{ color: '#5A7A65' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#15C45A'}
                    onMouseLeave={e => e.currentTarget.style.color = '#5A7A65'}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Contato */}
          <div>
            <ColHeading>Contato</ColHeading>
            <ul className="space-y-4">
              <li>
                <p className="font-mono text-[11px] uppercase tracking-[2px] mb-1" style={{ color: '#3A5545' }}>Email</p>
                <a
                  href="mailto:contato@zinkra.com.br"
                  className="text-[14px] transition-colors duration-200"
                  style={{ color: '#5A7A65' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#15C45A'}
                  onMouseLeave={e => e.currentTarget.style.color = '#5A7A65'}
                >
                  contato@zinkra.com.br
                </a>
              </li>
              <li>
                <p className="font-mono text-[11px] uppercase tracking-[2px] mb-1" style={{ color: '#3A5545' }}>WhatsApp</p>
                <a
                  href="https://wa.me/5511941164044"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] transition-colors duration-200"
                  style={{ color: '#5A7A65' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#15C45A'}
                  onMouseLeave={e => e.currentTarget.style.color = '#5A7A65'}
                >
                  (11) 94116-4044
                </a>
              </li>
              <li>
                <p className="font-mono text-[11px] uppercase tracking-[2px] mb-1" style={{ color: '#3A5545' }}>Instagram</p>
                <a
                  href="https://instagram.com/zinkra.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] transition-colors duration-200"
                  style={{ color: '#5A7A65' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#15C45A'}
                  onMouseLeave={e => e.currentTarget.style.color = '#5A7A65'}
                >
                  @zinkra.dev
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4 — Serviços */}
          <div>
            <ColHeading>Serviços</ColHeading>
            <ul className="space-y-3">
              {SERVICE_LINKS.map(l => (
                <li key={l.label}>
                  <Link
                    to={l.href}
                    className="text-[14px] transition-colors duration-200"
                    style={{ color: '#5A7A65' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#15C45A'}
                    onMouseLeave={e => e.currentTarget.style.color = '#5A7A65'}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Divider + NAP + copyright */}
        <div className="h-px mt-14 mb-8" style={{ backgroundColor: '#1A2E20' }} />

        <address
          className="not-italic text-center mb-6"
          itemScope
          itemType="https://schema.org/LocalBusiness"
        >
          <span itemProp="name" className="sr-only">Zinkra — Software House</span>
          <p className="font-mono text-[11px]" style={{ color: '#3A5545' }}>
            <a
              href="tel:+5511941164044"
              itemProp="telephone"
              className="transition-colors duration-200"
              style={{ color: '#3A5545' }}
              onMouseEnter={e => e.currentTarget.style.color = '#15C45A'}
              onMouseLeave={e => e.currentTarget.style.color = '#3A5545'}
            >
              (11) 94116-4044
            </a>
            {' · '}
            <a
              href="mailto:contato@zinkra.com.br"
              itemProp="email"
              className="transition-colors duration-200"
              style={{ color: '#3A5545' }}
              onMouseEnter={e => e.currentTarget.style.color = '#15C45A'}
              onMouseLeave={e => e.currentTarget.style.color = '#3A5545'}
            >
              contato@zinkra.com.br
            </a>
          </p>
          <p className="font-mono text-[11px] mt-1" style={{ color: '#3A5545' }}>
            CNPJ: 64.132.169/0001-60
          </p>
        </address>

        <p className="text-center font-mono text-[12px]" style={{ color: '#3A5545' }}>
          © 2026 Zinkra Software House · Todos os direitos reservados
        </p>

      </div>
    </footer>
  )
}
