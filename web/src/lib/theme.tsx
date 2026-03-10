import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
    mode: ThemeMode;
    resolvedTheme: 'light' | 'dark';
    setMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = 'ortaq:theme-mode';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

function applyThemeClass(theme: 'light' | 'dark') {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }: PropsWithChildren) {
    const [mode, setModeState] = useState<ThemeMode>(() => {
        if (typeof window === 'undefined') return 'system';
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            return stored as ThemeMode;
        }
        return 'system';
    });

    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
        if (mode === 'system') return getSystemTheme();
        return mode;
    });

    useEffect(() => {
        if (mode === 'system') {
            const systemTheme = getSystemTheme();
            setResolvedTheme(systemTheme);
            applyThemeClass(systemTheme);

            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => {
                const newSystemTheme = getSystemTheme();
                setResolvedTheme(newSystemTheme);
                applyThemeClass(newSystemTheme);
            };

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            setResolvedTheme(mode);
            applyThemeClass(mode);
        }
    }, [mode]);

    const value = useMemo<ThemeContextValue>(
        () => ({
            mode,
            resolvedTheme,
            setMode: (nextMode) => {
                setModeState(nextMode);
                window.localStorage.setItem(STORAGE_KEY, nextMode);
            },
        }),
        [mode, resolvedTheme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
