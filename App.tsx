/**
 * KangNaengBot App
 * React Native WebView 앱 - 기존 웹앱을 네이티브 앱으로 래핑
 */
import React, { useEffect, useCallback } from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MainScreen } from './src/screens/MainScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { useAuthStore, AuthTokens } from './src/stores/useAuthStore';
import {
  initializeAuth,
  signOut,
  refreshAccessToken,
} from './src/services/authService';

export type RootStackParamList = {
  Login: undefined;
  Main: { accessToken?: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// 스플래시/로딩 화면
const SplashScreen: React.FC = () => (
  <View style={styles.splashContainer}>
    <ActivityIndicator size="large" color="#6366f1" />
  </View>
);

const App: React.FC = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const isGuest = useAuthStore(state => state.isGuest);
  const accessToken = useAuthStore(state => state.accessToken);
  const user = useAuthStore(state => state.user);
  const setLoading = useAuthStore(state => state.setLoading);
  const login = useAuthStore(state => state.login);
  const loginAsGuest = useAuthStore(state => state.loginAsGuest);
  const logout = useAuthStore(state => state.logout);

  // 앱 시작 시 인증 상태 초기화
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeAuth();
      } catch (error) {
        console.error('[App] Auth initialization failed:', error);
        setLoading(false);
      }
    };

    initialize();
  }, [setLoading]);

  // 로그인 성공 핸들러
  const handleLoginSuccess = useCallback((token: string) => {
    // 이미 useAuthStore에서 업데이트됨 (saveAuthData에서)
    console.log('[App] Login success');
  }, []);

  // 게스트 모드 핸들러
  const handleGuestMode = useCallback(() => {
    loginAsGuest();
    console.log('[App] Guest mode activated');
  }, [loginAsGuest]);

  // 로그아웃 핸들러
  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      console.log('[App] Logout success');
    } catch (error) {
      console.error('[App] Logout error:', error);
      // 에러가 나도 상태는 초기화
      logout();
    }
  }, [logout]);

  // 세션 만료 핸들러 (WebView에서 호출)
  const handleSessionExpired = useCallback(async () => {
    console.log('[App] Session expired, attempting refresh...');

    // 토큰 갱신 시도
    const newTokens = await refreshAccessToken();
    if (!newTokens) {
      // 갱신 실패 → 로그아웃
      await handleLogout();
    }
  }, [handleLogout]);

  // 게스트 모드에서 로그인 요청 핸들러 (WebView에서 로그인 버튼 클릭 시)
  const handleRequestLogin = useCallback(() => {
    console.log(
      '[App] Login requested from WebView, switching to login screen',
    );
    logout(); // 게스트 상태 초기화 → 로그인 화면 표시
  }, [logout]);

  // 로딩 중 (스플래시)
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#0f172a"
          translucent={false}
        />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#0f172a' },
          }}
        >
          {isAuthenticated ? (
            <Stack.Screen name="Main">
              {props => (
                <MainScreen
                  {...props}
                  accessToken={accessToken}
                  isGuest={isGuest}
                  userInfo={user}
                  onLogout={handleLogout}
                  onSessionExpired={handleSessionExpired}
                  onRequestLogin={handleRequestLogin}
                />
              )}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Login">
              {() => (
                <LoginScreen
                  onLoginSuccess={handleLoginSuccess}
                  onGuestMode={handleGuestMode}
                />
              )}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
});

export default App;
