const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
          100: '#f3f4f6',
          400: '#9ca3af',
          500: '#6366f1'
        },
        secondary: {
          DEFAULT: '#1f2937',
          dark: '#111827',
          300: '#9ca3af',
          400: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827'
        },
        accent: '#8b5cf6',
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        text: {
          primary: '#f3f4f6',
          secondary: '#9ca3af'
        },
        gaming: {
          primary: '#FF4655',
          accent: '#FF7F50',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Lexend', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      },
      boxShadow: {
        'glow': '0 0 15px rgba(255, 70, 85, 0.3)',
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio')
  ]
}

