import React from 'react'

const TECHS = [
  'React.js', 'Next.js', 'Node.js', 'TypeScript',
  'Tailwind CSS', 'PostgreSQL', 'OpenAI', 'Vercel',
  'Figma', 'WordPress', 'Meta Ads', 'AWS',
  'Python', 'React Native', 'Stripe', 'Firebase',
]

export default function TechStack() {
  const items = [...TECHS, ...TECHS]

  return (
    <div
      className="overflow-hidden"
      style={{
        backgroundColor: '#F5F7F5',
        borderTop: '1px solid #E8EDEA',
        borderBottom: '1px solid #E8EDEA',
      }}
    >
      <div className="flex items-center gap-4 px-8 py-4">
        <p
          className="font-mono text-[10px] uppercase tracking-[3px] whitespace-nowrap shrink-0"
          style={{ color: '#9AA5A0' }}
        >
          Stack que dominamos
        </p>
        <div className="h-px flex-1" style={{ backgroundColor: '#E8EDEA' }} />
      </div>

      <div className="overflow-hidden pb-4">
        <div
          className="flex gap-3"
          style={{
            width: 'max-content',
            animation: 'tech-marquee 32s linear infinite',
          }}
        >
          {items.map((t, i) => (
            <span
              key={i}
              className="shrink-0 font-mono text-[11px] px-4 py-1.5 rounded-full whitespace-nowrap"
              style={{ border: '1px solid #E0E8E3', color: '#7A8880' }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
