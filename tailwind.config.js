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
          light: '#818cf8',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81'
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
          900: '#111827'
        },
        accent: {
          DEFAULT: '#8b5cf6',
          light: '#a78bfa',
          dark: '#7c3aed',
          100: '#ede9fe',
          500: '#8b5cf6',
          900: '#4c1d95'
        },
        success: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
          100: '#d1fae5'
        },
        error: {
          DEFAULT: '#ef4444',
          light: '#f87171',
          dark: '#dc2626',
          100: '#fee2e2'
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
          100: '#fef3c7'
        },
        text: {
          primary: '#f3f4f6',
          secondary: '#9ca3af',
          dark: '#1f2937'
        },
        gaming: {
          primary: '#FF4655',
          accent: '#FF7F50',
          dark: '#0F172A',
          darker: '#020617',
          success: '#10B981',
          error: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6'
        }
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['Lexend', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      },
      boxShadow: {
        'glow': '0 0 15px rgba(255, 70, 85, 0.3)',
        'glow-primary': '0 0 15px rgba(99, 102, 241, 0.5)',
        'glow-primary-lg': '0 0 25px rgba(99, 102, 241, 0.6)',
        'glow-success': '0 0 15px rgba(16, 185, 129, 0.5)',
        'glow-error': '0 0 15px rgba(239, 68, 68, 0.5)',
        'neon': '0 0 5px theme(colors.gaming.primary), 0 0 20px theme(colors.gaming.primary)',
        'neon-success': '0 0 5px theme(colors.gaming.success), 0 0 20px theme(colors.gaming.success)',
        'neon-error': '0 0 5px theme(colors.gaming.error), 0 0 20px theme(colors.gaming.error)',
        'glass': '0 0 15px rgba(255, 255, 255, 0.1)'
      },
      animation: {
        'gradient-shift': 'gradient 3s ease infinite',
        'value-change': 'valueChange 0.3s ease-out',
        'pulse-subtle': 'pulseSoft 2s ease-in-out infinite',
        'dice-roll': 'dice-roll 1s ease-out',
        'number-pop': 'number-pop 0.3s ease-out',
        'glow-pulse': 'glow-pulse 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'bounce-subtle': 'bounceSoft 2s infinite'
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
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '0.3' }
        },
        diceRoll: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.2)' },
          '100%': { transform: 'rotate(360deg) scale(1)' }
        },
        numberPop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' }
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6', boxShadow: '0 0 15px rgba(255, 70, 85, 0.3)' },
          '50%': { opacity: '0.3', boxShadow: '0 0 25px rgba(255, 70, 85, 0.5)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-gaming': 'linear-gradient(to right, var(--gaming-primary), var(--gaming-accent))'
      },
      spacing: {
        '128': '32rem',
        '144': '36rem'
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem'
      },
      scale: {
        '175': '1.75',
        '200': '2'
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio')
  ]
}

1206