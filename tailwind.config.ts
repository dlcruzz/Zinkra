import type { Config } from 'tailwindcss';

// Cores vêm de variáveis CSS (globals.css) para o tema claro/escuro trocar sem recompilar.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: v('brand'), dark: v('brand-dark'), glow: v('brand-glow') },
        bg: v('bg'),
        surface: v('surface'),
        line: v('line'),
        fg: v('fg'),
        muted: v('muted'),
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        // DT Getai Grotesk (fonte oficial da marca) não está no projeto: Space Grotesk é a substituta.
        brand: ['var(--font-brand)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { tightest: '-0.045em' },
      transitionTimingFunction: { out: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    },
  },
  plugins: [],
};
export default config;
