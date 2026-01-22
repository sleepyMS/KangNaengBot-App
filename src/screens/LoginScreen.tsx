/**
 * 로그인 화면 컴포넌트
 * SaaS 수준의 UI/UX, 접근성, 에러 핸들링 포함
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Linking,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  configureGoogleSignIn,
  signInWithGoogle,
  authenticateWithBackend,
  saveAuthData,
  AuthError,
} from '../services/authService';
import {
  useNetworkStatus,
  checkNetworkConnection,
} from '../hooks/useNetworkStatus';
import { useAuthStore } from '../stores/useAuthStore';

interface LoginScreenProps {
  onLoginSuccess: (accessToken: string) => void;
  onGuestMode: () => void;
}

// 강냉봇 로고 (logo.svg를 컴포넌트로)
const KangNaengBotLogo = () => (
  <Svg width={120} height={120} viewBox="0 0 172 172" fill="none">
    <Path
      d="M91.7715 121V49.656H138.934C142.865 49.656 146.162 50.1556 148.827 51.1548C151.491 52.0874 153.59 53.3864 155.122 55.0518C156.721 56.6505 157.82 58.5157 158.419 60.6474C159.085 62.7124 159.418 64.9773 159.418 67.442C159.418 69.8402 159.119 71.9052 158.519 73.6372C157.92 75.3692 157.12 76.8014 156.121 77.9338C155.188 78.9996 154.189 79.8656 153.123 80.5318C152.124 81.1313 150.992 81.7308 149.726 82.3304C151.325 82.7967 152.857 83.4295 154.322 84.2289C155.788 85.0282 157.153 86.1274 158.419 87.5263C159.685 88.8586 160.717 90.5572 161.517 92.6223C162.316 94.6873 162.716 97.1521 162.716 100.016C162.716 102.281 162.316 104.613 161.517 107.011C160.717 109.342 159.385 111.574 157.52 113.706C155.721 115.837 153.223 117.603 150.026 119.002C146.828 120.334 142.965 121 138.435 121H91.7715ZM106.76 60.8472V78.6333H134.738C136.003 78.6333 137.169 78.5333 138.235 78.3335C139.301 78.067 140.3 77.634 141.233 77.0345C142.232 76.435 142.998 75.5357 143.531 74.3366C144.13 73.071 144.43 71.4722 144.43 69.5404C144.43 66.5428 143.464 64.3445 141.532 62.9456C139.601 61.5467 136.47 60.8472 132.14 60.8472H106.76ZM106.76 89.2249V109.809H133.639C135.57 109.809 137.302 109.676 138.835 109.409C140.367 109.143 141.766 108.643 143.031 107.91C144.297 107.178 145.296 106.112 146.029 104.713C146.762 103.314 147.128 101.515 147.128 99.317C147.128 96.1195 146.096 93.6548 144.03 91.9228C141.965 90.1242 139.234 89.2249 135.837 89.2249H106.76Z"
      fill="#F1F5F9"
    />
    <Path
      d="M8.27923 81.8309V121H17.0723L19.1707 111.707C22.1017 115.238 25.9653 118.003 30.7616 120.001C35.5578 121.999 40.7537 122.999 46.3493 122.999C53.6103 122.999 59.9387 122.033 65.3344 120.101C70.6636 118.102 75.0268 115.371 78.4242 111.907C81.8215 108.377 84.3195 104.38 85.9183 99.9167C87.517 95.3869 88.3164 90.5241 88.3164 85.3281C88.3164 80.1322 87.4837 75.2694 85.8184 70.7396C84.153 66.2098 81.6217 62.213 78.2243 58.749C74.827 55.2851 70.4971 52.5872 65.2345 50.6554C59.972 48.6569 53.8102 47.6577 46.749 47.6577C41.4865 47.6577 36.657 48.2906 32.2604 49.5562C27.7972 50.8219 23.9669 52.5872 20.7694 54.8521C17.5053 57.117 14.9407 59.7815 13.0755 62.8458C11.1436 65.8434 9.9779 69.1075 9.57821 72.6381H25.7655C27.0312 68.0417 29.6291 64.6111 33.5594 62.3462C37.423 60.0147 41.9528 58.8489 47.1487 58.8489C51.6119 58.8489 55.5088 59.5151 58.8395 60.8474C62.1036 62.113 64.7682 63.9449 66.8333 66.343C68.8317 68.7412 70.3305 71.6056 71.3297 74.9363C72.2623 78.2004 72.7286 81.8309 72.7286 85.8278C72.7286 90.3575 72.0625 94.3211 70.7302 97.7184C69.3979 101.049 67.566 103.747 65.2345 105.812C62.903 107.877 60.2718 109.409 57.3407 110.408C54.3431 111.341 51.2122 111.807 47.9481 111.807C40.5539 111.807 34.925 110.209 31.0614 107.011C27.1311 103.814 24.5331 99.1506 23.2675 93.0221H43.4516V81.8309H8.27923Z"
      fill="#F1F5F9"
    />
  </Svg>
);

// Google 아이콘
const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </Svg>
);

// 에러 상태 타입
interface ErrorState {
  message: string;
  isRetryable: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onGuestMode,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetworkStatus();
  const setStoreError = useAuthStore(state => state.setError);

  // 애니메이션
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(30));

  useEffect(() => {
    // Google Sign-In 초기화
    configureGoogleSignIn();

    // 진입 애니메이션
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleGoogleLogin = useCallback(async () => {
    // 오프라인 체크
    const isOnline = await checkNetworkConnection();
    if (!isOnline) {
      setError({
        message: '인터넷 연결을 확인해주세요.',
        isRetryable: true,
      });
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // 1. Google 로그인
      const { userInfo, idToken } = await signInWithGoogle();

      // 2. 백엔드 인증
      const tokens = await authenticateWithBackend(idToken);

      // 3. 토큰 및 사용자 정보 저장
      await saveAuthData(tokens, userInfo);

      // 4. 성공 콜백
      onLoginSuccess(tokens.accessToken);
    } catch (err) {
      let errorMessage = '로그인에 실패했습니다.';
      let isRetryable = true;

      if (err instanceof AuthError) {
        errorMessage = err.message;
        isRetryable = err.isRetryable;

        // 취소는 에러로 표시하지 않음
        if (err.code === 'CANCELLED') {
          setIsLoading(false);
          return;
        }
      }

      setError({ message: errorMessage, isRetryable });
      setStoreError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [onLoginSuccess, setStoreError]);

  const handleGuestMode = useCallback(() => {
    useAuthStore.getState().loginAsGuest();
    onGuestMode();
  }, [onGuestMode]);

  const handleRetry = useCallback(() => {
    setError(null);
    handleGoogleLogin();
  }, [handleGoogleLogin]);

  const openPrivacyPolicy = useCallback(() => {
    Linking.openURL('https://kangnaeng.com/privacy');
  }, []);

  const openTerms = useCallback(() => {
    Linking.openURL('https://kangnaeng.com/terms');
  }, []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
      {/* 오프라인 배너 */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>오프라인 상태입니다</Text>
        </View>
      )}

      {/* 상단 콘텐츠 영역 - 로고 + 서브타이틀 */}
      <Animated.View
        style={[
          styles.contentArea,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <KangNaengBotLogo />
          <Text
            style={styles.subtitle}
            accessibilityRole="header"
            accessibilityLabel="강냉봇: AI가 만들어주는 나만의 시간표"
          >
            {'AI가 만들어주는\n나만의 시간표'}
          </Text>
        </View>
      </Animated.View>

      {/* 에러 메시지 */}
      {error && (
        <Animated.View
          style={[styles.errorContainer, { opacity: fadeAnim }]}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.errorText}>{error.message}</Text>
          {error.isRetryable && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              accessibilityLabel="다시 시도하기"
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* 하단 버튼 영역 */}
      <View style={styles.buttonArea}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>로그인 중...</Text>
          </View>
        ) : (
          <>
            {/* Google 로그인 버튼 */}
            <TouchableOpacity
              style={[styles.googleButton, isOffline && styles.buttonDisabled]}
              onPress={handleGoogleLogin}
              activeOpacity={0.8}
              disabled={isOffline}
              accessibilityLabel="Google 계정으로 로그인"
              accessibilityRole="button"
              accessibilityHint="Google 계정을 사용하여 로그인합니다"
              accessibilityState={{ disabled: isOffline }}
            >
              <GoogleIcon />
              <Text style={styles.googleButtonText}>Google로 계속하기</Text>
            </TouchableOpacity>

            {/* 게스트 모드 버튼 */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuestMode}
              activeOpacity={0.7}
              accessibilityLabel="게스트로 둘러보기"
              accessibilityRole="button"
              accessibilityHint="로그인 없이 앱을 둘러봅니다. 일부 기능이 제한됩니다."
            >
              <Text style={styles.guestButtonText}>게스트로 둘러보기</Text>
            </TouchableOpacity>
          </>
        )}

        {/* 약관 링크 */}
        <View style={styles.legalLinks}>
          <TouchableOpacity
            onPress={openTerms}
            accessibilityRole="link"
            accessibilityLabel="이용약관 열기"
          >
            <Text style={styles.legalLinkText}>이용약관</Text>
          </TouchableOpacity>
          <Text style={styles.legalDivider}>•</Text>
          <TouchableOpacity
            onPress={openPrivacyPolicy}
            accessibilityRole="link"
            accessibilityLabel="개인정보 처리방침 열기"
          >
            <Text style={styles.legalLinkText}>개인정보 처리방침</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c1222',
  },
  offlineBanner: {
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#f1f5f9',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 26,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    alignItems: 'center',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonArea: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 9999,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e2e8f0',
  },
  guestButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 8,
  },
  guestButtonText: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  legalLinkText: {
    color: '#64748b',
    fontSize: 12,
  },
  legalDivider: {
    color: '#64748b',
    fontSize: 12,
  },
});
