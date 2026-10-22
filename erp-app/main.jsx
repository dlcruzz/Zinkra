import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import ErpApp from './src/erp/ErpApp.jsx'

// ERP Zinkra: aplicação separada do site, servida em /erp (veja next.config.mjs e erp-app/vite.config.js)
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/erp/*" element={<Suspense fallback={<div style={{ minHeight: '100vh', background: '#0A0C0B' }} />}><ErpApp /></Suspense>} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)
