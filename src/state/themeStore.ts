import { create } from 'zustand';
import type { ThemeMode } from '@/styles/theme';

type ThemePreference = 'system' | 'user';

type ThemeStoreState = {
  mode: ThemeMode;
  preference: ThemePreference;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  applySystemMode: (mode: ThemeMode) => void;
  resetPreference: () => void;
};

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  mode: 'light',
  preference: 'system',
  setMode: (mode) => {
    set({ mode, preference: 'user' });
  },
  toggleMode: () => {
    const { mode } = get();
    const nextMode: ThemeMode = mode === 'light' ? 'dark' : 'light';
    set({ mode: nextMode, preference: 'user' });
  },
  applySystemMode: (mode) => {
    if (get().preference === 'system') {
      set({ mode });
    }
  },
  resetPreference: () => set({ preference: 'system' })
}));
