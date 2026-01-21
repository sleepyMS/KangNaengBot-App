/**
 * Main Screen - WebView를 호스팅하는 메인 화면
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebViewContainer } from '../components/WebViewContainer';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

export const MainScreen: React.FC<Props> = ({ route }) => {
  const { accessToken } = route.params ?? {};

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
        accessToken={accessToken}
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
