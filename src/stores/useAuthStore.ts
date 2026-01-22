/**
 * 인증 상태 관리 (Zustand)
 * 전역 인증 상태를 관리하고 persist합니다.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import EncryptedStorage from 'react-native-encrypted-storage';
import { StorageKeys } from '../config';

// 타입 정의
export interface UserInfo {
  id: string;
  email: string;
  name: string;
  photo?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp (ms)
}

interface AuthState {
  // 상태
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  user: UserInfo | null;
  error: string | null;

  // 액션
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (tokens: AuthTokens, user: UserInfo) => void;
  loginAsGuest: () => void;
  updateTokens: (tokens: AuthTokens) => void;
  logout: () => void;
  clearError: () => void;
  isTokenExpired: () => boolean;
  shouldRefreshToken: () => boolean;
}

// Zustand용 EncryptedStorage 어댑터
const encryptedStorageAdapter = {
  getItem: async (name: string) => {
    const value = await EncryptedStorage.getItem(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await EncryptedStorage.setItem(name, value);
  },
  removeItem: async (name: string) => {
    await EncryptedStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      isAuthenticated: false,
      isGuest: false,
      isLoading: true, // 앱 시작 시 true
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      user: null,
      error: null,

      // 로딩 상태 설정
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      // 에러 설정
      setError: (error: string | null) => set({ error }),

      // 에러 초기화
      clearError: () => set({ error: null }),

      // 로그인 (Google OAuth 성공 후)
      login: (tokens: AuthTokens, user: UserInfo) =>
        set({
          isAuthenticated: true,
          isGuest: false,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
          tokenExpiresAt: tokens.expiresAt ?? null,
          user,
          error: null,
          isLoading: false,
        }),

      // 게스트 로그인
      loginAsGuest: () =>
        set({
          isAuthenticated: true,
          isGuest: true,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          user: null,
          error: null,
          isLoading: false,
        }),

      // 토큰 갱신
      updateTokens: (tokens: AuthTokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? get().refreshToken,
          tokenExpiresAt: tokens.expiresAt ?? null,
        }),

      // 로그아웃 (상태만 초기화, 실제 signOut은 authService에서)
      logout: () =>
        set({
          isAuthenticated: false,
          isGuest: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          user: null,
          error: null,
          isLoading: false,
        }),

      // 토큰 만료 여부 확인
      isTokenExpired: () => {
        const { tokenExpiresAt } = get();
        if (!tokenExpiresAt) return false;
        return Date.now() >= tokenExpiresAt;
      },

      // 토큰 갱신 필요 여부 (만료 5분 전부터)
      shouldRefreshToken: () => {
        const { tokenExpiresAt, refreshToken } = get();
        if (!tokenExpiresAt || !refreshToken) return false;
        const threshold = 5 * 60 * 1000; // 5분
        return Date.now() >= tokenExpiresAt - threshold;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => encryptedStorageAdapter),
      // 민감 정보는 persist하지 않음 (재시작 시 다시 로드)
      partialize: state => ({
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
        user: state.user,
        // 토큰은 별도로 저장됨 (이전 호환성)
      }),
      onRehydrateStorage: () => state => {
        // rehydrate 완료 후 로딩 false
        if (state) {
          state.setLoading(false);
        }
      },
    },
  ),
);

// 토큰 관련 유틸리티 (별도 저장소에서 로드)
export const loadTokensFromStorage = async (): Promise<AuthTokens | null> => {
  try {
    const accessToken = await EncryptedStorage.getItem(
      StorageKeys.ACCESS_TOKEN,
    );
    const refreshToken = await EncryptedStorage.getItem(
      StorageKeys.REFRESH_TOKEN,
    );
    const expiryStr = await EncryptedStorage.getItem(StorageKeys.TOKEN_EXPIRY);

    if (!accessToken) return null;

    return {
      accessToken,
      refreshToken: refreshToken ?? undefined,
      expiresAt: expiryStr ? parseInt(expiryStr, 10) : undefined,
    };
  } catch {
    return null;
  }
};

export const saveTokensToStorage = async (
  tokens: AuthTokens,
): Promise<void> => {
  await EncryptedStorage.setItem(StorageKeys.ACCESS_TOKEN, tokens.accessToken);
  if (tokens.refreshToken) {
    await EncryptedStorage.setItem(
      StorageKeys.REFRESH_TOKEN,
      tokens.refreshToken,
    );
  }
  if (tokens.expiresAt) {
    await EncryptedStorage.setItem(
      StorageKeys.TOKEN_EXPIRY,
      tokens.expiresAt.toString(),
    );
  }
};

export const clearTokensFromStorage = async (): Promise<void> => {
  await EncryptedStorage.removeItem(StorageKeys.ACCESS_TOKEN);
  await EncryptedStorage.removeItem(StorageKeys.REFRESH_TOKEN);
  await EncryptedStorage.removeItem(StorageKeys.TOKEN_EXPIRY);
  await EncryptedStorage.removeItem(StorageKeys.USER_INFO);
  await EncryptedStorage.removeItem(StorageKeys.IS_GUEST);
};
