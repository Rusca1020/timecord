import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationType } from '@/types';

const STORAGE_KEY = 'notification_preferences';

type NotificationPreferences = Record<NotificationType, boolean>;

const DEFAULT_PREFERENCES: NotificationPreferences = {
  approval_request: true,
  approved: true,
  rejected: true,
  penalty: true,
  exchange_request: true,
  exchange_approved: true,
  exchange_rejected: true,
};

export async function getPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    }
    return { ...DEFAULT_PREFERENCES };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function setPreference(type: NotificationType, enabled: boolean): Promise<void> {
  const prefs = await getPreferences();
  prefs[type] = enabled;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export async function isNotificationEnabled(type: NotificationType): Promise<boolean> {
  const prefs = await getPreferences();
  return prefs[type] ?? true;
}
