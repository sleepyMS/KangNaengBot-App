/**
 * Google Sign-In 서비스
 * 네이티브 Google 로그인을 처리하고 토큰을 관리합니다.
 */
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import EncryptedStorage from 'react-native-encrypted-storage';

// Google OAuth 클라이언트 ID (Android)
const GOOGLE_WEB_CLIENT_ID =
  '88199591627-k25f9qqapnr4fkrb1vvcquf7lq0m27re.apps.googleusercontent.com';

// 백엔드 API URL
const API_BASE_URL = 'https://agent-backend-api-88199591627.us-east4.run.app';

// 스토리지 키
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
};

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  photo?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Google Sign-In 초기화
 */
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
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
      throw new Error('ID Token을 받지 못했습니다.');
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
          throw new Error('로그인이 취소되었습니다.');
        case statusCodes.IN_PROGRESS:
          throw new Error('로그인이 이미 진행 중입니다.');
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error('Google Play 서비스를 사용할 수 없습니다.');
        default:
          throw new Error(`Google 로그인 오류: ${error.message}`);
      }
    }
    throw error;
  }
};

/**
 * 백엔드에 Google ID Token을 보내고 Access/Refresh Token 받기
 */
export const authenticateWithBackend = async (
  idToken: string,
): Promise<AuthTokens> => {
  const response = await fetch(`${API_BASE_URL}/auth/google/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: idToken }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `인증 실패: ${response.status}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
};

/**
 * 토큰을 안전하게 저장
 */
export const saveTokens = async (tokens: AuthTokens): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
  if (tokens.refreshToken) {
    await EncryptedStorage.setItem(
      STORAGE_KEYS.REFRESH_TOKEN,
      tokens.refreshToken,
    );
  }
};

/**
 * 사용자 정보 저장
 */
export const saveUserInfo = async (userInfo: UserInfo): Promise<void> => {
  await EncryptedStorage.setItem(
    STORAGE_KEYS.USER_INFO,
    JSON.stringify(userInfo),
  );
};

/**
 * 저장된 Access Token 가져오기
 */
export const getAccessToken = async (): Promise<string | null> => {
  return EncryptedStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
};

/**
 * 저장된 사용자 정보 가져오기
 */
export const getUserInfo = async (): Promise<UserInfo | null> => {
  const data = await EncryptedStorage.getItem(STORAGE_KEYS.USER_INFO);
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

  await EncryptedStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  await EncryptedStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  await EncryptedStorage.removeItem(STORAGE_KEYS.USER_INFO);
};

/**
 * 이미 로그인되어 있는지 확인
 */
export const isSignedIn = async (): Promise<boolean> => {
  const token = await getAccessToken();
  return !!token;
};
