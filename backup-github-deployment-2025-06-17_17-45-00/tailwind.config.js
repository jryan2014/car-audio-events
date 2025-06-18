/** @type {import('tailwindcss').Config} */
export default {
  content: {
    files: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    options: {
      // Enable scanning of dynamic class names in strings
      safelist: {
        standard: [
          // Dynamic color classes used in AdminMembership component
          'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-green-500',
          'bg-blue-500/20', 'bg-purple-500/20', 'bg-orange-500/20', 'bg-green-500/20',
          'text-blue-400', 'text-purple-400', 'text-orange-400', 'text-green-400',
          'border-blue-500', 'border-purple-500', 'border-orange-500', 'border-green-500',
          // Common dynamic classes that might be missed
          'opacity-0', 'opacity-100', 'scale-95', 'scale-100',
          'translate-y-0', 'translate-y-2', '-translate-y-2',
        ],
        // Pattern-based safelist for dynamic values
        pattern: [
          /^bg-(blue|purple|orange|green)-(500|400)$/,
          /^text-(blue|purple|orange|green)-(400|500)$/,
          /^border-(blue|purple|orange|green)-(500|400)$/,
        ]
      }
    }
  },
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f7ff',
          100: '#bae7ff',
          200: '#91d5ff',
          300: '#69c0ff',
          400: '#40a9ff',
          500: '#1890ff',
          600: '#096dd9',
          700: '#0050b3',
          800: '#003a8c',
          900: '#002766',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        electric: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#0ea5e9',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        purple: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        }
      },
      fontFamily: {
        'display': ['Inter', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 1s infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
  // Add CSS optimization for production builds
  experimental: {
    optimizeUniversalDefaults: true,
  },
};