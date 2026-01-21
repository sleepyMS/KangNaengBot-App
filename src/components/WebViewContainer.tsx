/**
 * WebView Container Component
 * 기존 웹앱을 로드하고 네이티브 브릿지 통신을 처리합니다.
 */
import React, { useRef, useCallback, useState } from 'react';
import {
  StyleSheet,
  BackHandler,
  Platform,
  ActivityIndicator,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

const WEB_APP_URL = 'https://kangnaengbot.vercel.app';

interface BridgeMessage {
  type: string;
  payload?: unknown;
}

interface WebViewContainerProps {
  onScheduleSaved?: (schedule: unknown) => void;
  onLogout?: () => void;
}

export const WebViewContainer: React.FC<WebViewContainerProps> = ({
  onScheduleSaved,
  onLogout,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // Safe Area 및 앱 환경 정보 주입
  const injectedJavaScript = `
    (function() {
      // Safe Area 값 주입
      document.documentElement.style.setProperty('--safe-area-inset-top', '${insets.top}px');
      document.documentElement.style.setProperty('--safe-area-inset-bottom', '${insets.bottom}px');
      document.documentElement.style.setProperty('--safe-area-inset-left', '${insets.left}px');
      document.documentElement.style.setProperty('--safe-area-inset-right', '${insets.right}px');
      
      // 앱 환경 표시
      window.IS_NATIVE_APP = true;
      window.PLATFORM = '${Platform.OS}';
      
      // 네이티브 메시지 수신 리스너
      window.addEventListener('nativeMessage', function(e) {
        console.log('[NativeBridge] Received:', e.detail);
      });
      
      true; // 주입 성공 표시
    })();
  `;

  // 네이티브 메시지 수신 처리
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message: BridgeMessage = JSON.parse(event.nativeEvent.data);

        switch (message.type) {
          case 'SCHEDULE_SAVED':
            onScheduleSaved?.(message.payload);
            break;
          case 'LOGOUT':
            onLogout?.();
            break;
          default:
            console.log('[WebViewContainer] Unknown message:', message.type);
        }
      } catch (error) {
        console.error('[WebViewContainer] Failed to parse message:', error);
      }
    },
    [onScheduleSaved, onLogout],
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        // JavaScript 설정
        javaScriptEnabled={true}
        domStorageEnabled={true}
        injectedJavaScript={injectedJavaScript}
        // 메시지 처리
        onMessage={handleMessage}
        // 네비게이션 상태
        onNavigationStateChange={navState => setCanGoBack(navState.canGoBack)}
        // 로딩 상태
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        // Android 전용 설정
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        // 캐시 설정
        cacheEnabled={true}
        // User Agent에 앱 식별자 추가
        applicationNameForUserAgent="KangNaengBotApp/1.0.0"
        // 에러 처리
        onError={syntheticEvent => {
          const { nativeEvent } = syntheticEvent;
          console.warn('[WebView] Error:', nativeEvent);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // 웹앱 배경색과 맞춤
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    zIndex: 1,
  },
});
