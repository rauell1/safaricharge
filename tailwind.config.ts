import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark energy-tech theme colors
        primary: {
          DEFAULT: '#0a0e1a',
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a4bcfd',
          400: '#8098fa',
          500: '#6172f3',
          600: '#4854e8',
          700: '#3b43d4',
          800: '#3139ab',
          900: '#0a0e1a',
        },
        secondary: {
          DEFAULT: '#1a1f35',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#1a1f35',
        },
        accent: {
          solar: '#fbbf24',
          'solar-bright': '#fcd34d',
          energy: '#10b981',
          'energy-bright': '#34d399',
          alert: '#ef4444',
          'alert-bright': '#f87171',
          grid: '#8b5cf6',
          'grid-bright': '#a78bfa',
          info: '#3b82f6',
          'info-bright': '#60a5fa',
          success: '#22c55e',
          warning: '#f59e0b',
        },
        dark: {
          surface: '#1a1f35',
          border: '#2d3548',
          text: {
            primary: '#f9fafb',
            secondary: '#d1d5db',
            tertiary: '#9ca3af',
            muted: '#6b7280',
          }
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(97, 114, 243, 0.25)',
        'glow-md': '0 0 24px rgba(97, 114, 243, 0.35)',
        'glow-lg': '0 0 36px rgba(97, 114, 243, 0.45)',
        'glow-solar': '0 0 24px rgba(251, 191, 36, 0.35)',
        'glow-energy': '0 0 24px rgba(16, 185, 129, 0.35)',
        'glow-alert': '0 0 24px rgba(239, 68, 68, 0.35)',
        'card': '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 4px 8px -2px rgba(0, 0, 0, 0.2), 0 16px 24px -4px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 20px 25px -5px rgba(0, 0, 0, 0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-dark': 'linear-gradient(to bottom right, #0a0e1a, #1a1f35)',
        'gradient-solar': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        'gradient-energy': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-grid': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'counter': 'counter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        counter: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.01em' }],
        'sm': ['0.875rem', { lineHeight: '1.375rem', letterSpacing: '0.01em' }],
        'base': ['1rem', { lineHeight: '1.625rem', letterSpacing: '0' }],
        'lg': ['1.125rem', { lineHeight: '1.875rem', letterSpacing: '-0.01em' }],
        'xl': ['1.25rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em' }],
      },
      spacing: {
        'xs': '0.25rem',
        'sm': '0.5rem',
        'md': '1rem',
        'lg': '1.5rem',
        'xl': '2rem',
        '2xl': '3rem',
      },
      borderRadius: {
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
