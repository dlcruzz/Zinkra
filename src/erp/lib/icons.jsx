import React from 'react'

const P = {
  dash: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  hoje: 'M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5',
  brain: 'M9 4a3 3 0 00-3 3v.3A3 3 0 004 10a3 3 0 001.2 2.4A3 3 0 006 17a3 3 0 003 3V4zM15 4a3 3 0 013 3v.3A3 3 0 0120 10a3 3 0 01-1.2 2.4A3 3 0 0118 17a3 3 0 01-3 3V4z',
  leads: 'M4 6h16M4 12h16M4 18h10',
  pipeline: 'M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v5h-4z',
  send: 'M3 11l18-7-7 18-2.5-8z',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8z',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  building: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6',
  folder: 'M3 6h6l2 2h10v11H3z',
  check: 'M4 12l5 5L20 6',
  cal: 'M4 5h16v15H4zM4 9h16M9 3v4M15 3v4',
  down: 'M12 5v14M6 13l6 6 6-6',
  up: 'M12 19V5M6 11l6-6 6 6',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z',
  book: 'M5 4h10a4 4 0 014 4v12H9a4 4 0 01-4-4z',
  users: 'M8 11a3 3 0 100-6 3 3 0 000 6zM16 11a3 3 0 100-6 3 3 0 000 6zM2 20c1-3 3-4.5 6-4.5s5 1.5 6 4.5M15 15.6c.4 0 .7-.1 1-.1 3 0 5 1.5 6 4.5',
  chart: 'M4 20V11M10 20V4M16 20v-7M2 20h20',
  sliders: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  bell: 'M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20a2 2 0 004 0',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  x: 'M6 6l12 12M18 6L6 18',
  play: 'M8 5l11 7-11 7z',
  stop: 'M6 6h12v12H6z',
  wa: 'M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-4-1z',
  ig: 'M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zM12 16a4 4 0 100-8 4 4 0 000 8zM17.5 6.5h.01',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 18l-6-6 6-6',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  download: 'M12 4v11M7 10l5 5 5-5M4 20h16',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  filter: 'M4 5h16l-6 8v6l-4-2v-4z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  money: 'M3 6h18v12H3zM12 15a3 3 0 100-6 3 3 0 000 6zM6 9v.01M18 15v.01',
  zap: 'M13 2L4 14h7l-1 8 9-12h-7z',
  menu: 'M4 7h16M4 12h16M4 17h16',
}

export function Icon({ name, size = 16, stroke = 1.7, className, style }) {
  const d = P[name] || P.more
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
      <path d={d} />
    </svg>
  )
}
