import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Services        from '../components/Services'
import FeaturedService from '../components/FeaturedService'

export default function Servicos() {
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    const id = hash.slice(1)
    const el = document.getElementById(id)
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
  }, [hash])

  return (
    <div style={{ paddingTop: '76px' }}>
      <Services />
      <FeaturedService />
    </div>
  )
}
