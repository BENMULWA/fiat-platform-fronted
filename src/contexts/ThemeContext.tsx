import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'jasiri_theme'

function getSystemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage unavailable (private mode, etc.)
  }
  return null
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // No stored choice yet → follow the device's light/dark setting so the
  // app matches what the user already has their phone/laptop set to.
  // Once they use the in-app toggle, that explicit choice is remembered
  // and takes over from the OS setting.
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme() ?? getSystemTheme())
  const [hasExplicitChoice, setHasExplicitChoice] = useState<boolean>(() => getStoredTheme() !== null)

  useEffect(() => {
    if (hasExplicitChoice) return
    let mql: MediaQueryList
    try {
      mql = window.matchMedia('(prefers-color-scheme: light)')
    } catch {
      return
    }
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'light' : 'dark')
    mql.addEventListener?.('change', handler)
    return () => mql.removeEventListener?.('change', handler)
  }, [hasExplicitChoice])

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore write failures
      }
      return next
    })
    setHasExplicitChoice(true)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
