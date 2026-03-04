import typography from '@tailwindcss/typography';
import containerQueries from '@tailwindcss/container-queries';
import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['index.html', 'src/**/*.{js,ts,jsx,tsx,html,css}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        'cinzel-decorative': ['Cinzel Decorative', 'serif'],
        fell: ['IM Fell English', 'Georgia', 'serif'],
      },
      colors: {
        border: 'oklch(var(--border))',
        input: 'oklch(var(--input))',
        ring: 'oklch(var(--ring) / <alpha-value>)',
        background: 'oklch(var(--background))',
        foreground: 'oklch(var(--foreground))',
        primary: {
          DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
          foreground: 'oklch(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
          foreground: 'oklch(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
          foreground: 'oklch(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
          foreground: 'oklch(var(--muted-foreground) / <alpha-value>)'
        },
        accent: {
          DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
          foreground: 'oklch(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'oklch(var(--popover))',
          foreground: 'oklch(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'oklch(var(--card))',
          foreground: 'oklch(var(--card-foreground))'
        },
        chart: {
          1: 'oklch(var(--chart-1))',
          2: 'oklch(var(--chart-2))',
          3: 'oklch(var(--chart-3))',
          4: 'oklch(var(--chart-4))',
          5: 'oklch(var(--chart-5))'
        },
        sidebar: {
          DEFAULT: 'oklch(var(--sidebar))',
          foreground: 'oklch(var(--sidebar-foreground))',
          primary: 'oklch(var(--sidebar-primary))',
          'primary-foreground': 'oklch(var(--sidebar-primary-foreground))',
          accent: 'oklch(var(--sidebar-accent))',
          'accent-foreground': 'oklch(var(--sidebar-accent-foreground))',
          border: 'oklch(var(--sidebar-border))',
          ring: 'oklch(var(--sidebar-ring))'
        },
        // Game-specific palette
        parchment: {
          DEFAULT: 'oklch(0.92 0.04 85)',
          dark: 'oklch(0.82 0.06 78)',
          light: 'oklch(0.96 0.02 85)',
        },
        sepia: {
          DEFAULT: 'oklch(0.35 0.08 55)',
          light: 'oklch(0.55 0.07 60)',
        },
        ochre: {
          DEFAULT: 'oklch(0.72 0.12 75)',
          dark: 'oklch(0.58 0.12 70)',
        },
        terracotta: {
          DEFAULT: 'oklch(0.55 0.16 35)',
          dark: 'oklch(0.42 0.16 30)',
        },
        'forest-green': {
          DEFAULT: 'oklch(0.40 0.12 145)',
          light: 'oklch(0.55 0.14 145)',
        },
        'deep-red': {
          DEFAULT: 'oklch(0.42 0.18 25)',
          light: 'oklch(0.58 0.18 30)',
        },
        gold: {
          DEFAULT: 'oklch(0.78 0.14 80)',
          dark: 'oklch(0.62 0.14 75)',
        },
        navy: {
          DEFAULT: 'oklch(0.28 0.08 240)',
          light: 'oklch(0.40 0.10 240)',
        },
        'native-green': {
          DEFAULT: 'oklch(0.42 0.14 145)',
          light: 'oklch(0.58 0.16 145)',
          bg: 'oklch(0.88 0.06 145)',
        },
        'colonizer-red': {
          DEFAULT: 'oklch(0.38 0.16 25)',
          light: 'oklch(0.55 0.18 30)',
          bg: 'oklch(0.90 0.05 25)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0,0,0,0.05)',
        parchment: '0 4px 24px oklch(0.35 0.08 55 / 0.25), inset 0 1px 0 oklch(0.95 0.03 85 / 0.5)',
        ornate: '0 0 0 1px oklch(0.65 0.07 65), 0 4px 16px oklch(0.35 0.08 55 / 0.2)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' }
        },
        'banner-in': {
          from: { opacity: '0', transform: 'scale(0.85) translateY(-20px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'banner-in': 'banner-in 0.5s ease-out forwards',
      }
    }
  },
  plugins: [typography, containerQueries, animate]
};
