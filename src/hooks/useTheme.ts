import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // ignore
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  return { theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}
