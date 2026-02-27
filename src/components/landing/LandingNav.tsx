import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LandingThemeToggle } from './LandingThemeToggle'

export const LandingNav: React.FC = () => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/80 dark:bg-[#0D0D0D]/80 backdrop-blur-sm border-b border-gray-200 dark:border-white/[0.06]' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="font-heading font-bold text-xl tracking-tight">
            <span className="text-gray-900 dark:text-white">QF</span>
            <span className="text-cyan-600 dark:text-cyan-400">Link</span>
          </Link>

          {/* Right side: Toggle + Launch App */}
          <div className="flex items-center gap-4">
            <LandingThemeToggle />
            <Link
              to="/home"
              className="bg-cyan-600 dark:bg-cyan-400 text-white dark:text-black font-bold px-6 py-2 rounded-none hover:bg-cyan-500 dark:hover:bg-cyan-300 transition-colors duration-200 text-sm"
            >
              Launch App
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
