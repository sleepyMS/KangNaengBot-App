/**
 * 인증 서비스
 * Google Sign-In, 백엔드 인증, 토큰 관리를 담당합니다.
 */
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import { jwtDecode } from 'jwt-decode';
import { Config, StorageKeys } from '../config';
import {
  useAuthStore,
  UserInfo,
  AuthTokens,
  saveTokensToStorage,
  clearTokensFromStorage,
  loadTokensFromStorage,
} from '../stores/useAuthStore';
import EncryptedStorage from 'react-native-encrypted-storage';

// JWT 페이로드 타입
interface JwtPayload {
  exp?: number;
  iat?: number;
  sub?: string;
}

// 에러 타입
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public isRetryable: boolean = false,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Google Sign-In 초기화
 */
export const configureGoogleSignIn = (): void => {
  GoogleSignin.configure({
    webClientId: Config.GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true, // refresh token을 받기 위해 필요
  });
};

/**
 * Google 로그인 수행
 */
export const signInWithGoogle = async (): Promise<{
  userInfo: UserInfo;
  idToken: string;
}> => {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!response.data?.idToken) {
      throw new AuthError('ID Token을 받지 못했습니다.', 'MISSING_ID_TOKEN');
    }

    const userInfo: UserInfo = {
      id: response.data.user.id,
      email: response.data.user.email,
      name: response.data.user.name ?? response.data.user.email,
      photo: response.data.user.photo ?? undefined,
    };

    return {
      userInfo,
      idToken: response.data.idToken,
    };
  } catch (error) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          throw new AuthError('로그인이 취소되었습니다.', 'CANCELLED');
        case statusCodes.IN_PROGRESS:
          throw new AuthError('로그인이 이미 진행 중입니다.', 'IN_PROGRESS');
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new AuthError(
            'Google Play 서비스를 사용할 수 없습니다.',
            'PLAY_SERVICES_UNAVAILABLE',
          );
        default:
          throw new AuthError(
            `Google 로그인 오류: ${error.message}`,
            'GOOGLE_ERROR',
            true,
          );
      }
    }
    throw new AuthError('알 수 없는 로그인 오류', 'UNKNOWN', true);
  }
};

/**
 * 타임아웃을 포함한 fetch
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number = Config.REQUEST_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * 재시도 로직을 포함한 fetch
 */
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries: number = Config.RETRY_ATTEMPTS,
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      // 5xx 에러는 재시도
      if (response.status >= 500 && attempt < retries - 1) {
        await delay(Config.RETRY_DELAY_MS * Math.pow(2, attempt)); // Exponential backoff
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // AbortError (타임아웃)는 재시도
      if (error instanceof Error && error.name === 'AbortError') {
        if (attempt < retries - 1) {
          await delay(Config.RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
      }

      // 네트워크 에러는 재시도
      if (error instanceof TypeError && attempt < retries - 1) {
        await delay(Config.RETRY_DELAY_MS * Math.pow(2, attempt));
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error('모든 재시도 실패');
};

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * JWT에서 만료 시간 추출
 */
const getTokenExpiry = (token: string): number | null => {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    if (decoded.exp) {
      return decoded.exp * 1000; // seconds → ms
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * 백엔드에 Google ID Token을 보내고 Access/Refresh Token 받기
 *
 * API 명세: docs/MOBILE_AUTH_API_SPEC.md 참조
 *
 * @param idToken Google Sign-In SDK에서 받은 ID Token (JWT)
 * @returns Access Token과 Refresh Token
 * @throws {AuthError} 인증 실패 시
 */
export const authenticateWithBackend = async (
  idToken: string,
): Promise<AuthTokens> => {
  if (!idToken || !idToken.trim()) {
    throw new AuthError('ID Token이 필요합니다.', 'MISSING_ID_TOKEN', false);
  }

  try {
    const response = await fetchWithRetry(
      `${Config.API_BASE_URL}/auth/google/callback`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Version': Config.APP_VERSION,
          'X-Client-Type': 'mobile', // 모바일 앱임을 명시
        },
        body: JSON.stringify({
          id_token: idToken,
        }),
      },
    );

    if (!response.ok) {
      const status = response.status;
      let errorMessage = `인증 실패: ${status}`;
      let errorDetails: any = {};

      try {
        const errorData = await response.json();
        errorDetails = errorData;

        // FastAPI 스타일 에러 응답 처리
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // Validation error
            const messages = errorData.detail.map(
              (err: any) => `${err.loc?.join('.')}: ${err.msg}`,
            );
            errorMessage = messages.join(', ');
          } else {
            // 단일 메시지
            errorMessage = errorData.detail;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // JSON 파싱 실패 시 기본 메시지 사용
      }

      console.error('[Auth] Backend authentication failed:', {
        status,
        message: errorMessage,
        details: errorDetails,
      });

      // HTTP 상태 코드별 에러 처리
      switch (status) {
        case 400:
          throw new AuthError(
            errorMessage || '잘못된 요청입니다. ID Token 형식을 확인해주세요.',
            'HTTP_400',
            false,
          );
        case 401:
          throw new AuthError(
            errorMessage ||
              'ID Token 검증에 실패했습니다. 다시 로그인해주세요.',
            'HTTP_401',
            false,
          );
        case 404:
          throw new AuthError(
            '인증 엔드포인트를 찾을 수 없습니다. 백엔드 설정을 확인해주세요.',
            'HTTP_404',
            false,
          );
        case 405:
          throw new AuthError(
            '백엔드가 POST 메서드를 지원하지 않습니다. 백엔드 개발자에게 문의하세요.\n\n참고: docs/MOBILE_AUTH_API_SPEC.md',
            'HTTP_405',
            false,
          );
        case 422:
          throw new AuthError(
            errorMessage || '요청 데이터가 올바르지 않습니다.',
            'HTTP_422',
            false,
          );
        case 500:
        case 502:
        case 503:
          throw new AuthError(
            errorMessage ||
              '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            `HTTP_${status}`,
            true, // 재시도 가능
          );
        default:
          throw new AuthError(
            errorMessage || `인증 실패: ${status}`,
            `HTTP_${status}`,
            status >= 500,
          );
      }
    }

    // 성공 응답 파싱
    const data = await response.json();

    // 필수 필드 검증
    if (!data.access_token) {
      throw new AuthError(
        '백엔드 응답에 access_token이 없습니다.',
        'INVALID_RESPONSE',
        false,
      );
    }

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token; // 선택사항일 수 있음
    const expiresAt = getTokenExpiry(accessToken);

    // expires_in이 있으면 사용, 없으면 JWT에서 추출
    let calculatedExpiresAt = expiresAt;
    if (data.expires_in && !expiresAt) {
      calculatedExpiresAt = Date.now() + data.expires_in * 1000;
    }

    console.log('[Auth] Successfully authenticated with backend');

    return {
      accessToken,
      refreshToken: refreshToken ?? '', // refresh token이 없을 수 있음
      expiresAt: calculatedExpiresAt ?? undefined,
    };
  } catch (error) {
    // AuthError는 그대로 전파
    if (error instanceof AuthError) throw error;

    // 네트워크/타임아웃 에러 처리
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AuthError(
        '서버 응답 시간 초과. 잠시 후 다시 시도해주세요.',
        'TIMEOUT',
        true,
      );
    }

    if (error instanceof TypeError) {
      throw new AuthError(
        '네트워크 연결을 확인해주세요.',
        'NETWORK_ERROR',
        true,
      );
    }

    // 알 수 없는 에러
    throw new AuthError(
      error instanceof Error
        ? `인증 중 오류가 발생했습니다: ${error.message}`
        : '인증 중 알 수 없는 오류가 발생했습니다.',
      'UNKNOWN',
      true,
    );
  }
};

/**
 * Refresh Token으로 Access Token 갱신
 */
export const refreshAccessToken = async (): Promise<AuthTokens | null> => {
  const refreshToken = await EncryptedStorage.getItem(
    StorageKeys.REFRESH_TOKEN,
  );
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetchWithRetry(
      `${Config.API_BASE_URL}/auth/refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Version': Config.APP_VERSION,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
    );

    if (!response.ok) {
      // 401/403은 refresh token 만료
      if (response.status === 401 || response.status === 403) {
        return null;
      }
      throw new Error(`Refresh failed: ${response.status}`);
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token;
    const expiresAt = getTokenExpiry(newAccessToken);

    const tokens: AuthTokens = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken ?? refreshToken, // 새 refresh token이 있으면 사용
      expiresAt: expiresAt ?? undefined,
    };

    // 저장소 업데이트
    await saveTokensToStorage(tokens);

    // Zustand 상태 업데이트
    useAuthStore.getState().updateTokens(tokens);

    return tokens;
  } catch {
    return null;
  }
};

/**
 * 토큰 및 사용자 정보 저장 (로그인 성공 시)
 */
export const saveAuthData = async (
  tokens: AuthTokens,
  userInfo: UserInfo,
): Promise<void> => {
  await saveTokensToStorage(tokens);
  await EncryptedStorage.setItem(
    StorageKeys.USER_INFO,
    JSON.stringify(userInfo),
  );

  // Zustand 상태 업데이트
  useAuthStore.getState().login(tokens, userInfo);
};

/**
 * 저장된 사용자 정보 가져오기
 */
export const getUserInfo = async (): Promise<UserInfo | null> => {
  const data = await EncryptedStorage.getItem(StorageKeys.USER_INFO);
  return data ? JSON.parse(data) : null;
};

/**
 * 로그아웃
 */
export const signOut = async (): Promise<void> => {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Google Sign-Out 실패해도 계속 진행
  }

  // 저장소 초기화
  await clearTokensFromStorage();

  // Zustand 상태 초기화
  useAuthStore.getState().logout();
};

/**
 * 앱 시작 시 인증 상태 초기화
 */
export const initializeAuth = async (): Promise<{
  isAuthenticated: boolean;
  tokens: AuthTokens | null;
  user: UserInfo | null;
}> => {
  const store = useAuthStore.getState();

  try {
    // 게스트 모드는 persist하지 않음 - 앱 재시작 시 로그인 화면 표시
    if (store.isGuest) {
      console.log('[Auth] Guest mode detected, clearing for fresh start');
      store.logout();
      return { isAuthenticated: false, tokens: null, user: null };
    }

    // 저장된 토큰 로드
    const tokens = await loadTokensFromStorage();
    const user = await getUserInfo();

    if (!tokens || !tokens.accessToken) {
      // 토큰 없음 - persist된 isAuthenticated 상태도 초기화
      store.logout();
      return { isAuthenticated: false, tokens: null, user: null };
    }

    // 토큰 만료 확인
    if (tokens.expiresAt && Date.now() >= tokens.expiresAt) {
      // 만료됨 → 갱신 시도
      const refreshedTokens = await refreshAccessToken();
      if (!refreshedTokens) {
        // 갱신 실패 → 로그아웃
        await signOut();
        return { isAuthenticated: false, tokens: null, user: null };
      }

      store.login(refreshedTokens, user!);
      return { isAuthenticated: true, tokens: refreshedTokens, user };
    }

    // 유효한 토큰
    if (user) {
      store.login(tokens, user);
    }
    return { isAuthenticated: true, tokens, user };
  } catch {
    store.setLoading(false);
    return { isAuthenticated: false, tokens: null, user: null };
  }
};

/**
 * 이미 로그인되어 있는지 확인 (간단한 체크)
 */
export const isSignedIn = async (): Promise<boolean> => {
  const tokens = await loadTokensFromStorage();
  return !!tokens?.accessToken;
};

/**
 * Access Token 가져오기 (필요시 갱신 포함)
 */
export const getAccessToken = async (): Promise<string | null> => {
  const store = useAuthStore.getState();

  // 게스트 모드
  if (store.isGuest) {
    return null;
  }

  // 토큰이 없으면 저장소에서 로드
  let token = store.accessToken;
  if (!token) {
    const tokens = await loadTokensFromStorage();
    token = tokens?.accessToken ?? null;
  }

  if (!token) {
    return null;
  }

  // 갱신 필요 여부 확인
  if (store.shouldRefreshToken()) {
    const refreshedTokens = await refreshAccessToken();
    if (refreshedTokens) {
      return refreshedTokens.accessToken;
    }
  }

  return token;
};
