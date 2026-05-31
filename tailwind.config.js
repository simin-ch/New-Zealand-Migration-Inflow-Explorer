/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: '#00ffee',
          blue: '#00b4d8',
        },
        dark: {
          bg: '#0a0e1a',
          panel: '#0f1629',
          border: '#1a2744',
          muted: '#2a3a5c',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
