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
        'glow-primary': '0 0 15px rgba(99, 102, 241, 0.5)',
        'glow-primary-lg': '0 0 25px rgba(99, 102, 241, 0.6)',
      },
      animation: {
        'gradient-shift': 'gradient 3s ease infinite',
        'value-change': 'valueChange 0.3s ease-out',
        'pulse-subtle': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        valueChange: {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '0.3' },
        },
      },
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio')
  ]
}

