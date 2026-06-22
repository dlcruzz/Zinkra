import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('zinkra-cookie-consent')
    if (!consent) setVisible(true)
    else if (consent === 'all') loadAnalytics()
  }, [])

  const accept = () => {
    localStorage.setItem('zinkra-cookie-consent', 'all')
    loadAnalytics()
    setVisible(false)
  }

  const essential = () => {
    localStorage.setItem('zinkra-cookie-consent', 'essential')
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed bottom-0 inset-x-0 z-[9999] px-4 pb-4 lg:px-8 lg:pb-6"
          role="dialog"
          aria-label="Aviso de cookies"
        >
          <div
            className="max-w-5xl mx-auto rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            style={{
              backgroundColor: '#0A0C0B',
              border: '1px solid rgba(21,196,90,0.25)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-[14px] mb-1">
                🍪 Este site usa cookies
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: '#5A7A65' }}>
                Utilizamos cookies para melhorar sua experiência e analisar o tráfego do site, em conformidade com a{' '}
                <strong className="text-white">LGPD</strong>. Você pode aceitar todos ou apenas os essenciais.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={essential}
                className="font-bold text-[13px] px-4 py-2.5 rounded-lg uppercase tracking-wide transition-all duration-200"
                style={{ border: '1.5px solid rgba(255,255,255,0.15)', color: '#8A9990', backgroundColor: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#8A9990' }}
              >
                Apenas essenciais
              </button>
              <button
                onClick={accept}
                className="font-bold text-[13px] px-5 py-2.5 rounded-lg uppercase tracking-wide transition-all duration-200"
                style={{ backgroundColor: '#15C45A', color: '#0A0C0B' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
              >
                Aceitar todos
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function loadAnalytics() {
  const GA_ID = 'G-XXXXXXXXXX' // substitua pelo seu Measurement ID do Google Analytics
  if (!GA_ID || GA_ID === 'G-XXXXXXXXXX') return
  if (document.getElementById('ga-script')) return
  const script = document.createElement('script')
  script.id  = 'ga-script'
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  script.async = true
  document.head.appendChild(script)
  window.dataLayer = window.dataLayer || []
  function gtag() { window.dataLayer.push(arguments) }
  gtag('js', new Date())
  gtag('config', GA_ID)
}
