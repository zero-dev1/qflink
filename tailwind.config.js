/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces (darkest to lightest)
        base: '#050505',
        'surface-1': '#0A0A0A',
        'surface-2': '#111111',
        'surface-3': '#1A1A1A',
        'surface-4': '#222222',
        overlay: 'rgba(0,0,0,0.6)',

        // Cyan accent
        cyan: {
          primary: '#06B6D4',
          hover: '#22D3EE',
          pressed: '#0891B2',
          muted: 'rgba(6,182,212,0.12)',
          border: 'rgba(6,182,212,0.25)',
        },

        // Text
        'text-primary': '#F5F5F5',
        'text-secondary': '#A3A3A3',
        'text-tertiary': '#636363',
        'text-on-cyan': '#050505',

        // Borders
        'border-subtle': 'rgba(255,255,255,0.06)',
        'border-medium': 'rgba(255,255,255,0.10)',
        'border-strong': 'rgba(255,255,255,0.15)',

        // Status
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#06B6D4',

        // Category colors (pod cards & rail avatars)
        'cat-trading': '#10B981',
        'cat-alpha': '#F59E0B',
        'cat-defi': '#8B5CF6',
        'cat-gaming': '#F97316',
        'cat-builders': '#3B82F6',
        'cat-social': '#06B6D4',
        'cat-nfts': '#EC4899',

        // Badge colors
        'badge-team': '#DADADA',
        'badge-dapplab': '#00EFE7',
        'badge-pioneer': '#FFD700',
        'badge-ambassador': '#FF6B35',
      },
      fontFamily: {
        sans: ['Satoshi', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Clash Display', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['36px', { lineHeight: '1.1', fontWeight: '600' }],
        'h1': ['28px', { lineHeight: '1.2', fontWeight: '600' }],
        'h2': ['22px', { lineHeight: '1.25', fontWeight: '600' }],
        'h3': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['15px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'label': ['13px', { lineHeight: '1.3', fontWeight: '500' }],
        'caption': ['11px', { lineHeight: '1.3', fontWeight: '500' }],
        'mono': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      borderRadius: {
        DEFAULT: '10px',
        sm: '8px',
        md: '10px',
        lg: '14px',
        pill: '999px',
      },
      spacing: {
        '4.5': '18px',
      },
      maxWidth: {
        'content': '800px',
        'content-wide': '960px',
        'modal': '480px',
        'connect': '400px',
        'toast': '360px',
      },
      keyframes: {
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'border-pulse': {
          '0%, 100%': { borderColor: 'rgba(6,182,212,0.25)' },
          '50%': { borderColor: 'rgba(6,182,212,0.6)' },
        },
        'check-draw': {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
        'badge-shimmer': {
          '0%': { backgroundPosition: '-100% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'unread-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.15)', opacity: '0.85' },
        },
        'toast-enter': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'toast-exit': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'block-slide': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '15%': { transform: 'translateX(0)', opacity: '1' },
          '85%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(-100%)', opacity: '0' },
        },
        'spotlight-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(-8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'fade-in': 'fade-in 200ms ease',
        'slide-up': 'slide-up 200ms ease',
        'border-pulse': 'border-pulse 1.5s ease-in-out infinite',
        'check-draw': 'check-draw 0.3s ease-out forwards',
        'badge-shimmer': 'badge-shimmer 1.5s ease-in-out 1',
        'unread-pulse': 'unread-pulse 2s ease-in-out infinite',
        'toast-enter': 'toast-enter 300ms ease-out',
        'toast-exit': 'toast-exit 200ms ease-in',
        'block-slide': 'block-slide 4s ease-in-out',
        'spotlight-in': 'spotlight-in 200ms ease-out',
      },
    },
  },
  plugins: [],
}
