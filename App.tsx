/**
 * KangNaengBot App
 * React Native WebView 앱 - 기존 웹앱을 네이티브 앱으로 래핑
 */
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MainScreen } from './src/screens/MainScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { isSignedIn, getAccessToken } from './src/services/authService';

export type RootStackParamList = {
  Login: undefined;
  Main: { accessToken?: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // 앱 시작 시 로그인 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const signedIn = await isSignedIn();
        if (signedIn) {
          const token = await getAccessToken();
          setAccessToken(token);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (token: string) => {
    setAccessToken(token);
    setIsAuthenticated(true);
  };

  const handleGuestMode = () => {
    // 게스트 모드: 토큰 없이 WebView로 이동
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setAccessToken(null);
    setIsAuthenticated(false);
  };

  // 로딩 중
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
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
            <Stack.Screen
              name="Main"
              component={MainScreen}
              initialParams={{ accessToken: accessToken ?? undefined }}
            />
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

export default App;
