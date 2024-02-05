import React, { createContext, useContext, useEffect, useState } from 'react';
import { colors, ThemeMode } from '../../styles/tokens';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  palette: typeof colors.light | typeof colors.dark;
}

const STORAGE_KEY = 'forgemind_expense_tracker_theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
      if (typeof window.matchMedia === 'function') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } catch {
      return 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', theme === 'dark');
    const selectedPalette = theme === 'dark' ? colors.dark : colors.light;
    root.style.setProperty('--bg-primary', selectedPalette.bgPrimary);
    root.style.setProperty('--bg-secondary', selectedPalette.bgSecondary);
    root.style.setProperty('--bg-tertiary', selectedPalette.bgTertiary);
    root.style.setProperty('--text-primary', selectedPalette.textPrimary);
    root.style.setProperty('--text-secondary', selectedPalette.textSecondary);
    root.style.setProperty('--text-muted', selectedPalette.textMuted);
    root.style.setProperty('--border-default', selectedPalette.borderDefault);
    root.style.setProperty('--border-strong', selectedPalette.borderStrong);
    root.style.setProperty('--accent-primary', selectedPalette.accentPrimary);
    root.style.setProperty('--accent-hover', selectedPalette.accentHover);
    root.style.setProperty('--accent-text', selectedPalette.accentText);
    root.style.setProperty('--danger', selectedPalette.danger);
    root.style.setProperty('--danger-bg', selectedPalette.dangerBg);
    root.style.setProperty('--success', selectedPalette.success);
    root.style.setProperty('--success-bg', selectedPalette.successBg);
    root.style.setProperty('--warning', selectedPalette.warning);
    root.style.setProperty('--warning-bg', selectedPalette.warningBg);
    root.style.setProperty('--focus-ring', selectedPalette.focusRing);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors in restricted environments
    }
  }, [theme]);

  const toggleTheme = () => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  const palette = theme === 'dark' ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: setThemeState, palette }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
