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
        gradient: {
          sunrise: ['#0EA5E9', '#7C3AED'],
          ocean: ['#06B6D4', '#3B82F6'],
          teal: ['#14B8A6', '#06B6D4'],
          aurora: ['#06B6D4', '#7C3AED', '#FB7185']
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'orbit-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.6' },
          '80%, 100%': { transform: 'scale(1.35)', opacity: '0' },
        },
        'draw-check': {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'orbit-float': 'orbit-float 4s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.2, 0.6, 0.4, 1) infinite',
        'draw-check': 'draw-check 0.6s 0.3s ease-out forwards',
        'spin-slow': 'spin-slow 14s linear infinite',
      },
    },
  },
  plugins: [],
}
