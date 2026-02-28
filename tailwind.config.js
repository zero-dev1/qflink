/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        qx: {
          // Dark mode colors (default)
          bg: 'var(--qx-bg)',
          elevated: 'var(--qx-elevated)',
          card: 'var(--qx-card)',
          'border-subtle': 'var(--qx-border-subtle)',
          'border-prominent': 'var(--qx-border-prominent)',
          'text-primary': 'var(--qx-text-primary)',
          'text-secondary': 'var(--qx-text-secondary)',
          'text-muted': 'var(--qx-text-muted)',
          'msg-other': 'var(--qx-msg-other)',
          'msg-other-text': 'var(--qx-msg-other-text)',
          'active-text': 'var(--qx-active-text)',
          'active-bg': 'var(--qx-active-bg)',
          'card-border': 'var(--qx-card-border)',
          success: '#00FF66',
          error: '#FF4466',
          warning: '#FFAA00',
        },
      },
      fontFamily: {
        sans: ['Urbanist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
        display: ['Urbanist', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'bubble': '16px',
      },
      boxShadow: {
        'card': 'var(--qx-shadow)',
      },
    },
  },
  plugins: [],
}
