import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

/** Sliding sun/moon switch bound to the global theme (html.light / html.dark). */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to sunlight mode'}
      title={isLight ? 'Sunlight mode' : 'Dark mode'}
      onClick={toggleTheme}
      className={`theme-toggle relative inline-flex items-center shrink-0 w-14 h-7 rounded-full border transition-colors duration-300 ${
        isLight ? 'bg-amber-100 border-amber-300' : 'bg-[#111827] border-[#1E2533]'
      } ${className}`}
    >
      <Moon className={`absolute left-1.5 w-3.5 h-3.5 transition-opacity duration-300 ${isLight ? 'opacity-70 text-slate-500' : 'opacity-0'}`} />
      <Sun className={`absolute right-1.5 w-3.5 h-3.5 transition-opacity duration-300 ${isLight ? 'opacity-0' : 'opacity-70 text-gray-400'}`} />
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow transition-transform duration-300 ${
          isLight ? 'translate-x-7 bg-amber-400 text-white' : 'translate-x-0 bg-blue-500 text-white'
        }`}
      >
        {isLight ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
      </span>
    </button>
  )
}
