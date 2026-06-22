import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import { AnimatePresence, motion } from 'framer-motion'

const NAV_LINKS = [
  { label: 'Início',   to: '/' },
  { label: 'Serviços', to: '/servicos', dropdown: [
    { label: 'Criação de Sites',    to: '/servicos#sites'    },
    { label: 'Redes Sociais',       to: '/servicos#social'   },
    { label: 'Sistemas Sob Medida', to: '/servicos#sistemas' },
    { label: 'IA e Automação',      to: '/servicos'          },
  ]},
  { label: 'Projetos', to: '/projetos' },
  { label: 'SaaS',     to: '/saas'     },
  { label: 'Sobre',    to: '/sobre'    },
  { label: 'Contato',  to: '/contato'  },
]

function WAIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export default function Navbar() {
  const navRef                      = useRef(null)
  const [open, setOpen]             = useState(false)
  const [dropOpen, setDropOpen]     = useState(false)
  const [scrolled, setScrolled]     = useState(false)
  const { pathname }                = useLocation()

  /* close mobile menu on route change */
  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    gsap.fromTo(navRef.current,
      { y: -24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power4.out', delay: 0.1 }
    )
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      ref={navRef}
      className={`fixed z-50 transition-all duration-500 ${scrolled ? 'top-3 inset-x-4 lg:inset-x-8 rounded-2xl py-3' : 'top-0 inset-x-0 rounded-none py-4'}`}
      style={{
        backgroundColor: scrolled ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: scrolled ? '1px solid rgba(232,237,234,0.6)' : '1px solid transparent',
        borderBottom: scrolled ? 'none' : '1px solid rgba(232,237,234,0.8)',
        boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center select-none" aria-label="Zinkra — início">
          <img
            src="/images/logo-preto.png"
            alt="Zinkra"
            className="h-8 w-auto"
          />
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map(({ label, to, dropdown }) =>
            dropdown ? (
              <div key={label} className="relative" onMouseEnter={() => setDropOpen(true)} onMouseLeave={() => setDropOpen(false)}>
                <Link
                  to={to}
                  className="flex items-center gap-1 text-[#4A5550] font-medium text-sm hover:text-[#0A0C0B] transition-colors duration-200 py-1"
                >
                  {label}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M3 4.5l3 3 3-3" />
                  </svg>
                </Link>
                <AnimatePresence>
                  {dropOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-2 w-52 rounded-xl overflow-hidden"
                      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8EDEA', boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}
                    >
                      {dropdown.map(item => (
                        <Link
                          key={item.label}
                          to={item.to}
                          className="block px-4 py-3 text-[13px] font-medium transition-colors duration-150"
                          style={{ color: '#4A5550' }}
                          onClick={() => setDropOpen(false)}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F5F7F5'; e.currentTarget.style.color = '#15C45A' }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = '#4A5550' }}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                key={to}
                to={to}
                className="relative text-[#4A5550] font-medium text-sm hover:text-[#0A0C0B] transition-colors duration-200 group py-1"
              >
                {label}
                <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#15C45A] transition-[width] duration-300 group-hover:w-full rounded-full" />
              </Link>
            )
          )}
        </div>

        {/* CTA */}
        <a
          href="https://wa.me/5511941164044"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-white transition-all duration-200 uppercase tracking-wide"
          style={{ backgroundColor: '#15C45A' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
        >
          <WAIcon />
          Fale Conosco
        </a>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-2 text-[#0A0C0B]"
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        >
          <div className="w-5 h-4 flex flex-col justify-between">
            <span className={`block h-0.5 bg-[#0A0C0B] origin-center transition-all duration-300 ${open ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block h-0.5 bg-[#0A0C0B] transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 bg-[#0A0C0B] origin-center transition-all duration-300 ${open ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t px-6 py-5 flex flex-col gap-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#E8EDEA' }}
          >
            {NAV_LINKS.map(({ label, to, dropdown }) => (
              <div key={label}>
                <Link
                  to={to}
                  className="block text-[#4A5550] font-medium text-sm hover:text-[#0A0C0B] transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
                {dropdown && (
                  <div className="mt-2 ml-4 space-y-2">
                    {dropdown.map(item => (
                      <Link
                        key={item.label}
                        to={item.to}
                        className="block text-[13px] transition-colors"
                        style={{ color: '#8A9990' }}
                        onClick={() => setOpen(false)}
                        onMouseEnter={e => e.currentTarget.style.color = '#15C45A'}
                        onMouseLeave={e => e.currentTarget.style.color = '#8A9990'}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <a
              href="https://wa.me/5511941164044"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm text-white mt-2 uppercase tracking-wide"
              style={{ backgroundColor: '#15C45A' }}
              onClick={() => setOpen(false)}
            >
              <WAIcon />
              Fale Conosco
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
