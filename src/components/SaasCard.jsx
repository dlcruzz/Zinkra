import React from 'react'

export default function SaasCard({ name, desc, img, tags, demo, waText }) {
  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden transition-all duration-300"
      style={{ backgroundColor: '#0D1210', border: '1px solid #262E28' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(21,196,90,0.5)'
        e.currentTarget.style.transform   = 'translateY(-4px)'
        e.currentTarget.style.boxShadow   = '0 20px 40px rgba(0,0,0,0.2)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#262E28'
        e.currentTarget.style.transform   = 'translateY(0)'
        e.currentTarget.style.boxShadow   = 'none'
      }}
    >
      {/* Image / placeholder */}
      <div className="h-52 flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#0A0C0B' }}>
        {img ? (
          <img src={img} alt={name} className="w-full h-full object-contain p-4" loading="lazy" />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(21,196,90,0.25)" strokeWidth="1.2" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="font-mono text-[11px] uppercase tracking-[2px]" style={{ color: '#3A5545' }}>Em breve</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-6">
        <h3 className="font-bold text-[18px] text-white mb-2 leading-snug">{name}</h3>
        <p className="text-[14px] leading-relaxed mb-5 flex-1" style={{ color: '#7A9A85' }}>{desc}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tags.map(tag => (
            <span
              key={tag}
              className="font-mono text-[11px] px-2.5 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(21,196,90,0.08)', color: '#15C45A', border: '1px solid rgba(21,196,90,0.2)' }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {demo ? (
            <a
              href={demo}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center font-bold text-[12px] py-3 rounded-xl uppercase tracking-wide transition-all duration-200"
              style={{ backgroundColor: 'transparent', color: '#15C45A', border: '1.5px solid rgba(21,196,90,0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(21,196,90,0.08)'; e.currentTarget.style.borderColor = '#15C45A' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'rgba(21,196,90,0.35)' }}
            >
              Ver demonstração
            </a>
          ) : (
            <div
              className="flex-1 text-center font-bold text-[12px] py-3 rounded-xl uppercase tracking-wide"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#3A5545', border: '1.5px solid rgba(255,255,255,0.06)' }}
            >
              Em breve
            </div>
          )}
          <a
            href={`https://wa.me/5511941164044?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            data-wa-service="SaaS"
            className="flex-1 text-center font-bold text-[12px] py-3 rounded-xl uppercase tracking-wide transition-all duration-200"
            style={{ backgroundColor: '#15C45A', color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0EA84B'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15C45A'}
          >
            Solicitar acesso
          </a>
        </div>
      </div>
    </div>
  )
}
