/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mesh: {
          bg: '#0a0e17',
          surface: '#111827',
          card: '#131d2e',
          border: '#1e2d3d',
          mint: '#34d399',
          'mint-dark': '#10b981',
          'mint-dim': 'rgba(52,211,153,0.1)',
          amber: '#f59e0b',
          muted: '#6b7280',
          dim: '#374151',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
