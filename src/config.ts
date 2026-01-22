/**
 * 앱 설정
 * 환경변수 및 상수를 중앙에서 관리합니다.
 */

// React Native에서는 __DEV__ 글로벌 변수로 개발 환경 확인
declare const __DEV__: boolean;

export const Config = {
  // Google OAuth
  GOOGLE_WEB_CLIENT_ID:
    '88199591627-a603fsufai3053h47i66hogsbs5gb6pn.apps.googleusercontent.com',

  // API
  API_BASE_URL: __DEV__
    ? 'https://agent-backend-api-88199591627.us-east4.run.app' // 개발 시에도 프로덕션 API 사용
    : 'https://agent-backend-api-88199591627.us-east4.run.app',

  // 네트워크
  REQUEST_TIMEOUT_MS: 15000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,

  // 토큰
  TOKEN_REFRESH_THRESHOLD_MS: 5 * 60 * 1000, // 만료 5분 전 갱신

  // WebView
  WEB_APP_URL: 'https://kangnaeng.com',

  // 앱 정보
  APP_VERSION: '1.0.0',
  APP_NAME: 'KangNaengBotApp',
} as const;

// 스토리지 키
export const StorageKeys = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
  TOKEN_EXPIRY: 'token_expiry',
  IS_GUEST: 'is_guest',
} as const;

// 메시지 타입 (Native ↔ WebView)
export const BridgeMessageTypes = {
  // Native → WebView
  TOKEN_UPDATED: 'TOKEN_UPDATED',
  FORCE_LOGOUT: 'FORCE_LOGOUT',

  // WebView → Native
  SCHEDULE_SAVED: 'SCHEDULE_SAVED',
  LOGOUT: 'LOGOUT',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  TOKEN_REFRESH_NEEDED: 'TOKEN_REFRESH_NEEDED',
  REQUEST_LOGIN: 'REQUEST_LOGIN', // 게스트 모드에서 로그인 요청
  THEME_CHANGED: 'THEME_CHANGED', // 테마 변경
  LOCALE_CHANGED: 'LOCALE_CHANGED', // 언어 변경
} as const;
