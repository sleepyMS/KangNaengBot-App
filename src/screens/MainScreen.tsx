/**
 * Main Screen - WebView를 호스팅하는 메인 화면
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebViewContainer } from '../components/WebViewContainer';

export const MainScreen: React.FC = () => {
  const handleScheduleSaved = (schedule: unknown) => {
    console.log('[MainScreen] Schedule saved:', schedule);
    // TODO: 위젯 데이터 업데이트
    // TODO: 알림 스케줄링 업데이트
  };

  const handleLogout = () => {
    console.log('[MainScreen] User logged out');
    // TODO: Secure Storage 토큰 삭제
    // TODO: 알림 취소
  };

  return (
    <View style={styles.container}>
      <WebViewContainer
        onScheduleSaved={handleScheduleSaved}
        onLogout={handleLogout}
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
