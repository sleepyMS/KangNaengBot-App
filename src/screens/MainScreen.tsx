/**
 * Main Screen - WebView를 호스팅하는 메인 화면
 */
import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  WebViewContainer,
  WebViewContainerRef,
} from '../components/WebViewContainer';
import {
  NotificationPrimeModal,
  useNotificationPrime,
} from '../components/modals/NotificationPrimeModal';
import type { UserInfo } from '../stores/useAuthStore';

interface MainScreenProps {
  accessToken: string | null;
  isGuest: boolean;
  userInfo: UserInfo | null;
  onLogout: () => Promise<void>;
  onSessionExpired: () => Promise<void>;
  onRequestLogin?: () => void; // 게스트 모드에서 로그인 요청
}

export const MainScreen: React.FC<MainScreenProps> = ({
  accessToken,
  isGuest,
  userInfo,
  onLogout,
  onSessionExpired,
  onRequestLogin,
}) => {
  const webViewRef = useRef<WebViewContainerRef>(null);
  const { showPrime, handleAllow, handleClose } = useNotificationPrime();

  const handleScheduleSaved = useCallback((schedule: any) => {
    console.log(
      '[MainScreen] Schedule saved, updating Native Widget & Notifications...',
    );

    // Lazy import to avoid cycle if any
    const { widgetService } = require('../services/widgetService');

    // Updates both Widget (Native) and Notifications (Native)
    widgetService.updateWidget(schedule);
  }, []);

  const handleLogout = useCallback(async () => {
    console.log('[MainScreen] User logged out from WebView');
    await onLogout();
  }, [onLogout]);

  const handleSessionExpired = useCallback(async () => {
    console.log('[MainScreen] Session expired in WebView');
    await onSessionExpired();
  }, [onSessionExpired]);

  /* eslint-disable @typescript-eslint/no-var-requires */
  const handleAllowWithSync = useCallback(async () => {
    await handleAllow();
    // 권한 요청 후 실제 상태 확인 (약간의 딜레이 필요할 수 있음)
    const { notificationService } = require('../services/notificationService');
    const granted = await notificationService.checkPermission();

    if (granted) {
      console.log(
        '[MainScreen] Notification permission granted, syncing to Web...',
      );
      // Default: enabled=true, offset=10 (matched with useNotificationPrime logic)
      webViewRef.current?.syncNotificationState(true, 10, true);
    }
  }, [handleAllow]);

  return (
    <View style={styles.container}>
      <WebViewContainer
        ref={webViewRef}
        accessToken={accessToken}
        isGuest={isGuest}
        userInfo={userInfo}
        onScheduleSaved={handleScheduleSaved}
        onLogout={handleLogout}
        onSessionExpired={handleSessionExpired}
        onRequestLogin={onRequestLogin}
      />

      {/* Onboarding Prime Modal */}
      <NotificationPrimeModal
        isVisible={showPrime && !isGuest} // 게스트는 알림 설정 보여주지 않음 (선택 사항)
        onClose={handleClose}
        onAllow={handleAllowWithSync}
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
