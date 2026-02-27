import React, { useEffect, useState } from 'react'

export const LandingThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(true)

  // Initialize theme on mount - default to dark if no preference stored
  useEffect(() => {
    const stored = localStorage.getItem('qflink-theme')
    if (stored) {
      // If user has a preference in the main app, respect it
      if (stored === 'light') {
        setIsDark(false)
        document.documentElement.classList.remove('dark')
      } else if (stored === 'dark') {
        setIsDark(true)
        document.documentElement.classList.add('dark')
      } else {
        // system - check preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setIsDark(prefersDark)
        if (prefersDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
    } else {
      // Default to dark mode for landing page
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggle = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    if (newIsDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('qflink-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('qflink-theme', 'light')
    }
  }

  return (
    <button
      onClick={toggle}
      className={`w-9 h-9 flex items-center justify-center rounded-none transition-colors ${
        isDark
          ? 'text-gray-400 hover:text-white'
          : 'text-gray-600 hover:text-gray-900'
      }`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        // Moon icon for dark mode
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Sun icon for light mode
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  )
}
