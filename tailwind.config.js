const defaultTheme = require('tailwindcss/defaultTheme')
const plugin = require('tailwindcss/plugin')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
          light: '#818cf8',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b'
        },
        secondary: {
          DEFAULT: '#1f2937',
          dark: '#111827',
          light: '#374151',
          300: '#9ca3af',
          400: '#6b7280',
          500: '#4b5563',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#0a0f1a'
        },
        gaming: {
          primary: '#FF4655',
          accent: '#FF7F50',
          dark: '#0F172A',
          darker: '#020617',
          success: '#10B981',
          error: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
          muted: '#64748B',
          highlight: '#FB923C'
        },
        gradient: {
          'gaming-start': '#FF4655',
          'gaming-end': '#FF7F50',
          'dark-start': '#0F172A',
          'dark-end': '#020617'
        }
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['Lexend', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
        gaming: ['Lexend', 'sans-serif']
      },
      boxShadow: {
        'glow': '0 0 15px rgba(255, 70, 85, 0.3)',
        'glow-primary': '0 0 15px rgba(99, 102, 241, 0.5)',
        'glow-primary-lg': '0 0 25px rgba(99, 102, 241, 0.6)',
        'gaming': '0 0 20px rgba(255, 70, 85, 0.4)',
        'gaming-lg': '0 0 30px rgba(255, 70, 85, 0.5)',
        'gaming-xl': '0 0 40px rgba(255, 70, 85, 0.6)',
        'gaming-2xl': '0 0 50px rgba(255, 70, 85, 0.7)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.37)',
        'glass-lg': '0 12px 48px 0 rgba(31, 38, 135, 0.37)'
      },
      backgroundImage: {
        'gradient-gaming': 'linear-gradient(to right, var(--gaming-primary), var(--gaming-accent))',
        'gradient-gaming-vertical': 'linear-gradient(to bottom, var(--gaming-primary), var(--gaming-accent))',
        'gradient-dark': 'linear-gradient(to right, var(--gaming-dark), var(--gaming-darker))',
        'gradient-radial-gaming': 'radial-gradient(circle at center, var(--gaming-primary), var(--gaming-accent))',
        'mesh-pattern': 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0V0zm10 10h10v10H10V10zM0 10h10v10H0V10z\' fill=\'%23FF4655\' fill-opacity=\'0.05\'/%3E%3C/svg%3E")'
      },
      animation: {
        'gradient-shift': 'gradient 3s ease infinite',
        'value-change': 'valueChange 0.3s ease-out',
        'gaming-pulse': 'gamingPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gaming-float': 'gamingFloat 3s ease-in-out infinite',
        'gaming-spin': 'gamingSpin 1s linear infinite',
        'gaming-bounce': 'gamingBounce 1s infinite',
        'gaming-shake': 'gamingShake 0.5s infinite',
        'matrix-rain': 'matrixRain 20s linear infinite',
        'glitch': 'glitch 1s infinite'
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        valueChange: {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        gamingPulse: {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)',
            boxShadow: '0 0 20px rgba(255, 70, 85, 0.4)'
          },
          '50%': {
            opacity: '0.8',
            transform: 'scale(1.05)',
            boxShadow: '0 0 30px rgba(255, 70, 85, 0.6)'
          }
        },
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' }
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
    plugin(({ addUtilities }) => {
      addUtilities({
        '.text-shadow-gaming': {
          'text-shadow': '0 0 10px rgba(255, 70, 85, 0.5)'
        },
        '.gaming-border-gradient': {
          'border-image': 'linear-gradient(to right, #FF4655, #FF7F50) 1'
        },
        '.backdrop-gaming': {
          'backdrop-filter': 'blur(16px) brightness(0.9)'
        }
      })
    })
  ]
}

1206