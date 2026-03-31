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
          DEFAULT: '#0a0e1a',  // Very dark navy/black
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
          DEFAULT: '#1a1f35',  // Slightly lighter dark panel
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
          solar: '#fbbf24',      // Amber/yellow for solar
          energy: '#10b981',     // Green for energy/positive
          alert: '#ef4444',      // Red for alerts/errors
          grid: '#8b5cf6',       // Purple for grid/export
          info: '#3b82f6',       // Blue for info/consumption
        },
        dark: {
          surface: '#1a1f35',    // Elevated dark surface for cards
          border: '#2d3548',     // Soft border color
          text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
            tertiary: '#64748b',
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
        'glow-sm': '0 0 10px rgba(97, 114, 243, 0.2)',
        'glow-md': '0 0 20px rgba(97, 114, 243, 0.3)',
        'glow-lg': '0 0 30px rgba(97, 114, 243, 0.4)',
        'glow-solar': '0 0 20px rgba(251, 191, 36, 0.3)',
        'glow-energy': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-alert': '0 0 20px rgba(239, 68, 68, 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-dark': 'linear-gradient(to bottom right, #0a0e1a, #1a1f35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'counter': 'counter 0.5s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
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
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
    },
  },
  plugins: [],
};

export default config;
