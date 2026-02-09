import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;
let Constants: typeof import('expo-constants')['default'] | null = null;

// 네이티브에서만 모듈 로드 (웹에서는 skip)
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
    Constants = require('expo-constants').default;
  } catch {
    // 모듈 로드 실패 시 무시
  }
}

// 앱 시작 시 알림 핸들러 설정
export function configureNotifications(): void {
  if (!Notifications || Platform.OS === 'web') return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// 푸시 토큰 등록
export async function registerPushToken(userId: string): Promise<string | null> {
  if (Platform.OS === 'web' || !Notifications || !Device) return null;

  try {
    // 실제 기기인지 확인
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // 권한 요청
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    // Expo 푸시 토큰 가져오기
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;

    // DB에 저장 (upsert)
    await supabase.from('push_tokens').upsert(
      { user_id: userId, token, platform: Platform.OS },
      { onConflict: 'user_id,token' }
    );

    return token;
  } catch (err) {
    console.error('Failed to register push token:', err);
    return null;
  }
}

// 푸시 토큰 제거 (로그아웃 시)
export async function removePushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;

  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    await supabase.from('push_tokens').delete()
      .eq('user_id', userId)
      .eq('token', tokenData.data);
  } catch {
    // 토큰 제거 실패 시 무시
  }
}

// 특정 유저에게 푸시 알림 발송
export async function sendPushToUser(
  recipientUserId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    // 수신자의 푸시 토큰 조회
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', recipientUserId);

    if (!tokens || tokens.length === 0) return;

    // Expo Push API로 발송
    const messages = tokens.map(t => ({
      to: t.token,
      sound: 'default' as const,
      title,
      body,
      data: data || {},
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error('Failed to send push notification:', err);
  }
}
