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
      },
      animation: {
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'fade-in': 'fade-in 200ms ease',
        'slide-up': 'slide-up 200ms ease',
      },
    },
  },
  plugins: [],
}
