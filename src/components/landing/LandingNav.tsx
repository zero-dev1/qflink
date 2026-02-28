import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LandingThemeToggle } from './LandingThemeToggle'
import { QFLinkWordmark } from '@/components/QFLinkWordmark'

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

          {/* Right side: Toggle + Launch App */}
          <div className="flex items-center gap-4">
            <LandingThemeToggle />
            <Link
              to="/connect"
              className="bg-cyan-600 text-white font-bold px-6 py-2 rounded-none hover:bg-cyan-700 transition-colors duration-200 text-sm"
            >
              Launch App
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
