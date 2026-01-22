/**
 * 설정 스토어 (테마, 언어)
 * FE와 양방향 동기화 지원
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

type Theme = 'light' | 'dark' | 'system';
type Language = 'ko' | 'en' | 'ja' | 'zh';

interface SettingsState {
  // 사용자 선택 테마 (FE에서 동기화됨)
  theme: Theme;
  // 실제 적용되는 테마
  resolvedTheme: 'light' | 'dark';
  // 언어 설정
  language: Language;

  // Actions
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  getResolvedTheme: () => 'light' | 'dark';
}

// 시스템 테마 가져오기
const getSystemTheme = (): 'light' | 'dark' => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: getSystemTheme(),
      language: 'ko',

      setTheme: (theme: Theme) => {
        const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
        set({ theme, resolvedTheme });
      },

      setLanguage: (language: Language) => {
        set({ language });
      },

      getResolvedTheme: () => {
        const { theme } = get();
        return theme === 'system' ? getSystemTheme() : theme;
      },
    }),
    {
      name: 'kangnaeng-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        theme: state.theme,
        language: state.language,
      }),
    },
  ),
);

// 시스템 테마 변경 리스너
Appearance.addChangeListener(({ colorScheme }) => {
  const { theme } = useSettingsStore.getState();
  if (theme === 'system') {
    const resolvedTheme = colorScheme === 'dark' ? 'dark' : 'light';
    useSettingsStore.setState({ resolvedTheme });
  }
});
