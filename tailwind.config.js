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
        qf: {
          // Dark mode colors (default)
          bg: 'var(--qf-bg)',
          elevated: 'var(--qf-elevated)',
          card: 'var(--qf-card)',
          'border-subtle': 'var(--qf-border-subtle)',
          'border-prominent': 'var(--qf-border-prominent)',
          'text-primary': 'var(--qf-text-primary)',
          'text-secondary': 'var(--qf-text-secondary)',
          'text-muted': 'var(--qf-text-muted)',
          accent: '#00FFFF',
          'accent-hover': '#00CCCC',
          'accent-text': '#161616',
          'msg-other': 'var(--qf-msg-other)',
          'msg-other-text': 'var(--qf-msg-other-text)',
          'active-text': 'var(--qf-active-text)',
          'active-bg': 'var(--qf-active-bg)',
          'card-border': 'var(--qf-card-border)',
          success: '#00FF66',
          error: '#FF4466',
          warning: '#FFAA00',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'bubble': '16px',
      },
      boxShadow: {
        'card': 'var(--qf-shadow)',
      },
    },
  },
  plugins: [],
}
