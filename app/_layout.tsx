import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox, View, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { useStore } from '@/store/useStore';
import { onAuthStateChange } from '@/services/authService';
import { configureNotifications, registerPushToken } from '@/services/pushService';
import { subscribeToNotifications } from '@/services/notificationService';

// react-native-paper 라이브러리 내부 경고 숨기기
LogBox.ignoreLogs([
  'props.pointerEvents is deprecated',
  '"shadow*" style props are deprecated',
]);

// 웹 콘솔 경고 숨기기
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0]?.toString() || '';
  if (
    message.includes('pointerEvents is deprecated') ||
    message.includes('shadow*') ||
    message.includes('boxShadow')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// 앱 테마 설정
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6366F1',       // 인디고
    secondary: '#10B981',     // 에메랄드
    tertiary: '#F59E0B',      // 앰버
    error: '#EF4444',         // 레드
    background: '#F8FAFC',
    surface: '#FFFFFF',
  },
};

SplashScreen.preventAutoHideAsync();

// 인증 상태 기반 라우트 보호 훅
function useProtectedRoute(isAuthenticated: boolean, isLoading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // 인증되지 않은 상태에서 보호된 라우트 접근 시 로그인으로 리다이렉트
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // 인증된 상태에서 auth 라우트 접근 시 메인으로 리다이렉트
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const {
    isAuthenticated,
    isLoading,
    user,
    setUser,
    setIsLoading,
    initializeAuth,
    addNotification,
  } = useStore();

  // 푸시 알림 핸들러 설정
  useEffect(() => {
    configureNotifications();
  }, []);

  // Supabase 인증 상태 초기화 및 구독
  useEffect(() => {
    // 초기 세션 복원
    initializeAuth();

    // 인증 상태 변경 구독
    const unsubscribe = onAuthStateChange((event, authUser) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(authUser);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 인증 후 푸시 토큰 등록 + 실시간 알림 구독
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // 푸시 토큰 등록
    registerPushToken(user.id);

    // 실시간 알림 구독
    const unsubscribe = subscribeToNotifications(user.id, (notification) => {
      useStore.getState().addNotification(notification);
    });

    return () => unsubscribe();
  }, [isAuthenticated, user?.id]);

  // 폰트 로딩 에러 처리
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // 스플래시 화면 숨기기
  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  // 인증 상태 기반 라우트 보호
  useProtectedRoute(isAuthenticated, isLoading);

  // 로딩 상태 표시
  if (!fontsLoaded || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </PaperProvider>
  );
}
