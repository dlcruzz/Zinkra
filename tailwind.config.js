/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'green-accent': '#15C45A',
        'green-bright': '#2EFF8B',
        'green-deep': '#0B6B38',
        'surface-1': '#111116',
        'surface-2': '#18211D',
        'border-col': '#2A2A35',
        'text-sec': '#C7D1CB',
        'text-muted': '#4A5550',
        'red-alert': '#FF4D4D',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        logo: ['Orbitron', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
