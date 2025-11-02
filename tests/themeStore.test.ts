import { afterEach, describe, expect, it } from 'vitest';
import { useThemeStore } from '@/state/themeStore';

describe('themeStore', () => {
  afterEach(() => {
    useThemeStore.setState({ mode: 'light', preference: 'system' });
  });

  it('toggles between light and dark modes with user preference', () => {
    expect(useThemeStore.getState().mode).toBe('light');
    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().preference).toBe('user');
  });

  it('ignores system updates when user preference is set', () => {
    useThemeStore.getState().toggleMode(); // sets preference to user
    useThemeStore.getState().applySystemMode('light');
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('applies system mode when preference is system', () => {
    useThemeStore.getState().applySystemMode('dark');
    expect(useThemeStore.getState().mode).toBe('dark');
  });
});
