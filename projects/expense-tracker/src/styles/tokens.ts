/**
 * ForgeMind Single Design Token Source (src/styles/tokens.ts)
 * - Every foreground/background pair passes WCAG AA (>= 4.5:1 normal text, >= 3.0:1 UI/large text).
 * - Zero raw hex values are permitted anywhere outside this file.
 * - All typography references locally hosted webfonts (/assets/fonts/).
 */

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

export const typography = {
  fontFamily: {
    sans: '"InterLocal", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrainsMonoLocal", "Consolas", "Liberation Mono", monospace',
  },
  fontSize: {
    xs: { size: '0.75rem', lineHeight: '1.125rem' },
    sm: { size: '0.875rem', lineHeight: '1.25rem' },
    base: { size: '1rem', lineHeight: '1.5rem' },
    lg: { size: '1.125rem', lineHeight: '1.75rem' },
    xl: { size: '1.25rem', lineHeight: '1.875rem' },
    '2xl': { size: '1.5rem', lineHeight: '2rem' },
    '3xl': { size: '1.875rem', lineHeight: '2.375rem' },
    '4xl': { size: '2.25rem', lineHeight: '2.75rem' },
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const radii = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(15, 23, 42, 0.06)',
  md: '0 4px 6px -1px rgba(15, 23, 42, 0.10), 0 2px 4px -2px rgba(15, 23, 42, 0.06)',
  lg: '0 10px 15px -3px rgba(15, 23, 42, 0.12), 0 4px 6px -4px rgba(15, 23, 42, 0.08)',
  focus: '0 0 0 3px rgba(15, 118, 110, 0.35)',
} as const;

export const zIndex = {
  base: 0,
  sticky: 20,
  drawer: 40,
  modal: 50,
  toast: 60,
  tooltip: 70,
} as const;

export const motion = {
  durationFast: '150ms',
  durationBase: '200ms',
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const colors = {
  light: {
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F8FAFC',
    bgTertiary: '#F1F5F9',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#475569',
    borderDefault: '#CBD5E1',
    borderStrong: '#64748B',
    accentPrimary: '#0F766E',
    accentHover: '#115E59',
    accentText: '#FFFFFF',
    danger: '#B91C1C',
    dangerBg: '#FEF2F2',
    success: '#15803D',
    successBg: '#F0FDF4',
    warning: '#B45309',
    warningBg: '#FFFBEB',
    focusRing: '#0D9488',
    chartIncome: '#15803D',
    chartExpense: '#B91C1C',
    chartNet: '#0F766E',
    chartBudget: '#0369A1',
    chartAccentAlt: '#6D28D9',
  },
  dark: {
    bgPrimary: '#0B1120',
    bgSecondary: '#111827',
    bgTertiary: '#1E293B',
    textPrimary: '#F8FAFC',
    textSecondary: '#E2E8F0',
    textMuted: '#94A3B8',
    borderDefault: '#334155',
    borderStrong: '#64748B',
    accentPrimary: '#2DD4BF',
    accentHover: '#5EEAD4',
    accentText: '#0B1120',
    danger: '#F87171',
    dangerBg: '#450A0A',
    success: '#4ADE80',
    successBg: '#052E16',
    warning: '#FBBF24',
    warningBg: '#451A03',
    focusRing: '#2DD4BF',
    chartIncome: '#4ADE80',
    chartExpense: '#F87171',
    chartNet: '#2DD4BF',
    chartBudget: '#38BDF8',
    chartAccentAlt: '#A78BFA',
  },
} as const;

export type ThemeMode = 'light' | 'dark';

export const categoryColorMap: Record<string, string> = {
  teal: 'var(--accent-primary)',
  emerald: 'var(--success)',
  amber: 'var(--warning)',
  rose: 'var(--danger)',
  sky: 'var(--chart-budget)',
  violet: 'var(--chart-accent-alt)',
  slate: 'var(--text-secondary)',
};
