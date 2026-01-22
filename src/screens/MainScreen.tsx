/**
 * Main Screen - WebView를 호스팅하는 메인 화면
 */
import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  WebViewContainer,
  WebViewContainerRef,
} from '../components/WebViewContainer';

interface MainScreenProps {
  accessToken: string | null;
  isGuest: boolean;
  onLogout: () => Promise<void>;
  onSessionExpired: () => Promise<void>;
}

export const MainScreen: React.FC<MainScreenProps> = ({
  accessToken,
  isGuest,
  onLogout,
  onSessionExpired,
}) => {
  const webViewRef = useRef<WebViewContainerRef>(null);

  const handleScheduleSaved = useCallback((schedule: unknown) => {
    console.log('[MainScreen] Schedule saved:', schedule);
    // TODO: 위젯 데이터 업데이트 (Phase 3)
    // TODO: 알림 스케줄링 업데이트 (Phase 4)
  }, []);

  const handleLogout = useCallback(async () => {
    console.log('[MainScreen] User logged out from WebView');
    await onLogout();
  }, [onLogout]);

  const handleSessionExpired = useCallback(async () => {
    console.log('[MainScreen] Session expired in WebView');
    await onSessionExpired();
  }, [onSessionExpired]);

  // 토큰 갱신 시 WebView에 새 토큰 주입
  const handleTokenRefreshed = useCallback((newToken: string) => {
    webViewRef.current?.injectToken(newToken);
  }, []);

  return (
    <View style={styles.container}>
      <WebViewContainer
        ref={webViewRef}
        accessToken={accessToken}
        isGuest={isGuest}
        onScheduleSaved={handleScheduleSaved}
        onLogout={handleLogout}
        onSessionExpired={handleSessionExpired}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});
