import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LandingThemeToggle } from './LandingThemeToggle'
import { QFLinkWordmark } from '@/components/QFLinkWordmark'

export const LandingNav: React.FC = () => {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const location = useLocation()
  const menuRef = useRef<HTMLDivElement>(null)

  // Initialize theme on mount
  useEffect(() => {
    const stored = localStorage.getItem('qflink-theme')
    if (stored) {
      if (stored === 'light') {
        setIsDark(false)
      } else if (stored === 'dark') {
        setIsDark(true)
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setIsDark(prefersDark)
      }
    } else {
      setIsDark(true)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const toggleTheme = () => {
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

  const navLinks = [
    { to: '/creators', label: 'Creators' },
    { to: '/communities', label: 'Community' },
    { to: '/whitepaper', label: 'Whitepaper' },
  ]

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/80 dark:bg-[#0D0D0D]/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="tracking-tight">
            <QFLinkWordmark size={28} variant="auto" />
          </Link>

          {/* Center nav links - Desktop only */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side: Toggle + Launch App + Hamburger (mobile) */}
          <div className="flex items-center gap-4" ref={menuRef}>
            <div className="hidden md:block">
              <LandingThemeToggle />
            </div>
            <Link
              to="/connect"
              className="bg-[#0991B2] text-white font-bold px-4 md:px-6 py-2 rounded-none hover:bg-[#077A96] transition-colors duration-200 text-sm"
            >
              <span className="hidden md:inline">Launch App</span>
              <span className="md:hidden">Launch</span>
            </Link>
            
            {/* Hamburger icon - Mobile only */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex flex-col justify-center items-center w-6 h-6 space-y-1.5"
              aria-label="Toggle menu"
            >
              <span 
                className={`w-6 h-0.5 bg-gray-900 dark:bg-white transition-transform duration-200 ${
                  menuOpen ? 'rotate-45 translate-y-2' : ''
                }`} 
              />
              <span 
                className={`w-6 h-0.5 bg-gray-900 dark:bg-white transition-opacity duration-200 ${
                  menuOpen ? 'opacity-0' : ''
                }`} 
              />
              <span 
                className={`w-6 h-0.5 bg-gray-900 dark:bg-white transition-transform duration-200 ${
                  menuOpen ? '-rotate-45 -translate-y-2' : ''
                }`} 
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div 
        className={`md:hidden bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-200 ${
          menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 py-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="block text-gray-900 dark:text-white text-lg py-3 px-6 hover:text-[#0991B2] transition-colors"
            >
              {link.label}
            </Link>
          ))}
          
          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-800 mx-6 my-2" />
          
          {/* Theme Toggle */}
          <button
            onClick={() => {
              toggleTheme()
            }}
            className="flex items-center gap-3 w-full text-left py-3 px-6 text-gray-900 dark:text-white hover:text-[#0991B2] transition-colors"
          >
            {/* Sun icon for dark mode (click to go light), Moon icon for light mode (click to go dark) */}
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>
    </nav>
  )
}
