/**
 * WebView Container Component
 * 기존 웹앱을 로드하고 네이티브 브릿지 통신을 처리합니다.
 * 양방향 토큰 동기화 및 세션 관리 지원
 */
import React, {
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  StyleSheet,
  BackHandler,
  Platform,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  NativeModules,
  ActivityIndicator,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Config, BridgeMessageTypes } from '../config';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAuthStore } from '../stores/useAuthStore';
import { useSettingsStore } from '../stores/useSettingsStore';

interface BridgeMessage {
  type: string;
  payload?: unknown;
}

// 유저 정보 타입 (RN useAuthStore와 동일)
interface UserInfo {
  id: string;
  email: string;
  name: string;
  photo?: string;
}

interface WebViewContainerProps {
  accessToken: string | null;
  isGuest?: boolean;
  userInfo?: UserInfo | null;
  onScheduleSaved?: (schedule: unknown) => void;
  onLogout?: () => void;
  onSessionExpired?: () => void;
  onRequestLogin?: () => void; // 게스트 모드에서 로그인 요청 시
}

export interface WebViewContainerRef {
  injectToken: (token: string) => void;
  reload: () => void;
  goBack: () => boolean;
}

export const WebViewContainer = forwardRef<
  WebViewContainerRef,
  WebViewContainerProps
>(
  (
    {
      accessToken,
      isGuest = false,
      userInfo,
      onScheduleSaved,
      onLogout,
      onSessionExpired,
      onRequestLogin,
    },
    ref,
  ) => {
    const webViewRef = useRef<WebView>(null);
    const [canGoBack, setCanGoBack] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);
    const insets = useSafeAreaInsets();
    const { isOffline, isConnected } = useNetworkStatus({
      onReconnect: () => {
        // 연결 복구 시 리로드
        if (hasError) {
          webViewRef.current?.reload();
          setHasError(false);
        }
      },
    });

    // 외부에서 사용할 수 있는 메서드 노출
    useImperativeHandle(ref, () => ({
      injectToken: (token: string) => {
        const script = `
        (function() {
          localStorage.setItem('access_token', '${escapeJsString(token)}');
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            try {
              const data = JSON.parse(authStorage);
              data.state = data.state || {};
              data.state.isAuthenticated = true;
              localStorage.setItem('auth-storage', JSON.stringify(data));
            } catch (e) {}
          }
          // 앱에 토큰 갱신 알림 (Race Condition 방지를 위해 지연 발송)
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('nativeTokenRefreshed', { detail: { token: '${escapeJsString(
              token,
            )}' } }));
          }, 100);
          true;
        })();
      `;
        webViewRef.current?.injectJavaScript(script);
      },
      reload: () => {
        webViewRef.current?.reload();
      },
      goBack: () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      },
    }));

    // JavaScript 문자열 이스케이프 (XSS 방지)
    const escapeJsString = (str: string): string => {
      return str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e');
    };

    // Safe Area 및 앱 환경 정보 주입 + 토큰 주입
    const injectedJavaScript = React.useMemo(() => {
      // FE User 타입에 맞게 변환 (photo -> picture)
      const userForFE = userInfo
        ? {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.photo,
          }
        : null;

      const tokenInjection = accessToken
        ? `
      localStorage.setItem('access_token', '${escapeJsString(accessToken)}');
      const authStorage = localStorage.getItem('auth-storage');
      const userFromNative = ${userForFE ? JSON.stringify(userForFE) : 'null'};
      
      if (authStorage) {
        try {
          const data = JSON.parse(authStorage);
          data.state = data.state || {};
          data.state.isAuthenticated = true;
          if (userFromNative) {
            data.state.user = userFromNative;
          }
          localStorage.setItem('auth-storage', JSON.stringify(data));
        } catch (e) {}
      } else {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: { 
            isAuthenticated: true,
            user: userFromNative,
          },
          version: 0
        }));
      }
      
      // 앱에 토큰 갱신 알림 (userInfo 포함하여 즉시 UI 업데이트)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('nativeTokenRefreshed', { 
          detail: { 
            token: '${escapeJsString(accessToken)}',
            userInfo: userFromNative
          } 
        }));
      }, 500);
      `
        : '';

      return `
      (function() {
        // Safe Area 값 주입
        document.documentElement.style.setProperty('--safe-area-inset-top', '${insets.top}px');
        document.documentElement.style.setProperty('--safe-area-inset-bottom', '${insets.bottom}px');
        document.documentElement.style.setProperty('--safe-area-inset-left', '${insets.left}px');
        document.documentElement.style.setProperty('--safe-area-inset-right', '${insets.right}px');
        
        // 네이티브에서 받은 토큰 주입 (자동 로그인)
        ${tokenInjection}
        
        // 세션 만료 감지 (기존 웹앱의 401 응답 등)
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
          const response = await originalFetch.apply(this, args);
          if (response.status === 401) {
            window.sendToNative('${BridgeMessageTypes.SESSION_EXPIRED}', {});
          }
          return response;
        };
        
        true; // 주입 성공 표시
      })();
    `;
    }, [accessToken, insets]);

    // 시스템 테마 감지
    const colorScheme = useColorScheme();

    // 시스템 언어 감지 (간단 버전)
    const getDeviceLocale = (): string => {
      const locales =
        NativeModules.SettingsManager?.settings?.AppleLocale || // iOS
        NativeModules.I18nManager?.localeIdentifier || // Android fallback
        'ko-KR';
      return locales.replace('_', '-');
    };

    // 페이지 로드 전에 실행될 스크립트 (IS_NATIVE_APP, sendToNative, 테마, 언어 먼저 정의)
    const injectedJavaScriptBeforeContentLoaded = React.useMemo(() => {
      const theme = colorScheme === 'dark' ? 'dark' : 'light';
      const locale = getDeviceLocale();

      return `
      (function() {
        // 앱 환경 표시 (페이지 로드 전에 설정해야 FE에서 감지 가능)
        window.IS_NATIVE_APP = true;
        window.PLATFORM = '${Platform.OS}';
        window.IS_GUEST = ${isGuest};
        
        // 시스템 테마 및 언어 (FE에서 감지하여 적용)
        window.NATIVE_THEME = '${colorScheme || 'light'}';
        window.NATIVE_LOCALE = '${getDeviceLocale()}';
        
        // 네이티브에 메시지 전송 헬퍼
        window.sendToNative = function(type, payload) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
          }
        };
        
        console.log('[NativeBridge] Initialized: IS_NATIVE_APP=' + window.IS_NATIVE_APP + ', Theme=' + window.NATIVE_THEME + ', Locale=' + window.NATIVE_LOCALE);
        true;
      })();
    `;
    }, [isGuest, colorScheme]);

    // 토큰 또는 유저 정보 변경 시 런타임 자동 주입 (Prop 변경 감지)
    React.useEffect(() => {
      if (!accessToken || !webViewRef.current) return;

      const userForFE = userInfo
        ? {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.photo,
          }
        : null;

      const script = `
        (function() {
          localStorage.setItem('access_token', '${escapeJsString(
            accessToken,
          )}');
          const authStorage = localStorage.getItem('auth-storage');
          const userFromNative = ${
            userForFE ? JSON.stringify(userForFE) : 'null'
          };
          
          if (authStorage) {
            try {
              const data = JSON.parse(authStorage);
              data.state = data.state || {};
              data.state.isAuthenticated = true;
              if (userFromNative) {
                data.state.user = userFromNative;
              }
              localStorage.setItem('auth-storage', JSON.stringify(data));
            } catch (e) {}
          }
          
          // 앱에 토큰 갱신 알림
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('nativeTokenRefreshed', { 
              detail: { 
                token: '${escapeJsString(accessToken)}',
                userInfo: userFromNative
              } 
            }));
          }, 100);
          true;
        })();
      `;

      webViewRef.current.injectJavaScript(script);
    }, [accessToken, userInfo]);

    // 네이티브 메시지 수신 처리
    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const message: BridgeMessage = JSON.parse(event.nativeEvent.data);

          switch (message.type) {
            case BridgeMessageTypes.SCHEDULE_SAVED:
              onScheduleSaved?.(message.payload);
              break;
            case BridgeMessageTypes.LOGOUT:
              onLogout?.();
              break;
            case BridgeMessageTypes.SESSION_EXPIRED:
              onSessionExpired?.();
              break;
            case BridgeMessageTypes.REQUEST_LOGIN:
              console.log('[WebViewContainer] Login requested from WebView');
              onRequestLogin?.();
              break;
            case BridgeMessageTypes.TOKEN_UPDATED: {
              const { token } = message.payload as { token: string };
              console.log('[WebViewContainer] Token updated from WebView');
              useAuthStore.getState().setAccessToken(token);
              break;
            }
            case BridgeMessageTypes.THEME_CHANGED: {
              const { theme } = message.payload as {
                theme: 'light' | 'dark' | 'system';
              };
              console.log(
                '[WebViewContainer] Theme changed from WebView:',
                theme,
              );
              useSettingsStore.getState().setTheme(theme);
              break;
            }
            case BridgeMessageTypes.LOCALE_CHANGED: {
              const { locale } = message.payload as {
                locale: 'ko' | 'en' | 'ja' | 'zh';
              };
              console.log(
                '[WebViewContainer] Locale changed from WebView:',
                locale,
              );
              useSettingsStore.getState().setLanguage(locale);
              break;
            }
            default:
              console.log('[WebViewContainer] Unknown message:', message.type);
          }
        } catch (error) {
          console.error('[WebViewContainer] Failed to parse message:', error);
        }
      },
      [onScheduleSaved, onLogout, onSessionExpired, onRequestLogin],
    );

    // Android 하드웨어 뒤로가기 처리
    useFocusEffect(
      useCallback(() => {
        const onBackPress = () => {
          if (canGoBack && webViewRef.current) {
            webViewRef.current.goBack();
            return true; // 이벤트 소비
          }
          return false; // 기본 동작 (앱 종료)
        };

        if (Platform.OS === 'android') {
          const subscription = BackHandler.addEventListener(
            'hardwareBackPress',
            onBackPress,
          );
          return () => subscription.remove();
        }
      }, [canGoBack]),
    );

    // 에러 화면 렌더링
    const renderError = () => (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>
          {isOffline ? '오프라인 상태입니다' : '페이지를 로드할 수 없습니다'}
        </Text>
        <Text style={styles.errorDescription}>
          {isOffline
            ? '인터넷 연결을 확인하고 다시 시도해주세요.'
            : '네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요.'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setHasError(false);
            webViewRef.current?.reload();
          }}
          accessibilityLabel="다시 시도"
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );

    // 오프라인 또는 에러 상태
    if (hasError || (isOffline && !isConnected)) {
      return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {renderError()}
        </View>
      );
    }

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <WebView
          ref={webViewRef}
          source={{ uri: Config.WEB_APP_URL }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          injectedJavaScript={injectedJavaScript}
          injectedJavaScriptBeforeContentLoaded={
            injectedJavaScriptBeforeContentLoaded
          }
          // 메시지 처리
          onMessage={handleMessage}
          // 네비게이션 상태
          onNavigationStateChange={navState => setCanGoBack(navState.canGoBack)}
          // Android 전용 설정
          allowsBackForwardNavigationGestures={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          // 네트워크/CORS 설정
          mixedContentMode="always"
          originWhitelist={['*']}
          allowUniversalAccessFromFileURLs={true}
          // 캐시 설정
          cacheEnabled={true}
          // User Agent에 앱 식별자 추가
          applicationNameForUserAgent={`${Config.APP_NAME}/${Config.APP_VERSION}`}
          // 에러 처리
          onError={syntheticEvent => {
            const { nativeEvent } = syntheticEvent;
            console.warn('[WebView] Error:', nativeEvent);
            setHasError(true);
          }}
          onHttpError={syntheticEvent => {
            const { nativeEvent } = syntheticEvent;
            console.warn(
              '[WebView] HTTP Error:',
              nativeEvent.statusCode,
              nativeEvent.url,
            );
            // 5xx 에러는 에러 화면 표시
            if (nativeEvent.statusCode >= 500) {
              setHasError(true);
            }
          }}
          // 로딩 표시
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
            </View>
          )}
        />
      </View>
    );
  },
);

WebViewContainer.displayName = 'WebViewContainer';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
