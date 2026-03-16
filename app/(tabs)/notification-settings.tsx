import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Switch, Divider, List } from 'react-native-paper';
import { useStore } from '@/store/useStore';
import { NotificationType } from '@/types';
import * as notificationPreferences from '@/services/notificationPreferences';

interface NotificationOption {
  type: NotificationType;
  label: string;
  description: string;
}

const CHILD_OPTIONS: { group: string; items: NotificationOption[] }[] = [
  {
    group: '활동 알림',
    items: [
      { type: 'approved', label: '활동 승인', description: '내 활동이 승인되었을 때' },
      { type: 'rejected', label: '활동 거절', description: '내 활동이 거절되었을 때' },
    ],
  },
  {
    group: '벌금 알림',
    items: [
      { type: 'penalty', label: '벌금 부여', description: '벌금이 부여되었을 때' },
    ],
  },
  {
    group: '교환 알림',
    items: [
      { type: 'exchange_approved', label: '교환 승인', description: '교환이 승인되었을 때' },
      { type: 'exchange_rejected', label: '교환 거절', description: '교환이 거절되었을 때' },
    ],
  },
];

const PARENT_OPTIONS: { group: string; items: NotificationOption[] }[] = [
  {
    group: '승인 요청 알림',
    items: [
      { type: 'approval_request', label: '활동 승인 요청', description: '자녀가 활동 승인을 요청했을 때' },
    ],
  },
  {
    group: '교환 알림',
    items: [
      { type: 'exchange_request', label: '교환 신청', description: '자녀가 교환을 신청했을 때' },
    ],
  },
];

export default function NotificationSettingsScreen() {
  const user = useStore((state) => state.user);
  const isParent = user?.role === 'parent';
  const options = isParent ? PARENT_OPTIONS : CHILD_OPTIONS;

  const [prefs, setPrefs] = useState<Record<NotificationType, boolean> | null>(null);

  useEffect(() => {
    notificationPreferences.getPreferences().then(setPrefs);
  }, []);

  const handleToggle = useCallback(async (type: NotificationType, value: boolean) => {
    setPrefs((prev) => prev ? { ...prev, [type]: value } : prev);
    await notificationPreferences.setPreference(type, value);
  }, []);

  if (!prefs) return null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>알림 설정</Text>
        <Text style={styles.subtitle}>알림 종류별로 수신 여부를 설정하세요</Text>
      </View>

      {options.map((section) => (
        <View key={section.group} style={styles.section}>
          <Text style={styles.groupTitle}>{section.group}</Text>
          {section.items.map((item, idx) => (
            <View key={item.type}>
              {idx > 0 && <Divider />}
              <List.Item
                title={item.label}
                description={item.description}
                right={() => (
                  <Switch
                    value={prefs[item.type] ?? true}
                    onValueChange={(val) => handleToggle(item.type, val)}
                    color="#6B4226"
                  />
                )}
                style={styles.listItem}
              />
            </View>
          ))}
        </View>
      ))}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: 'bold', color: '#3E2723' },
  subtitle: { color: '#A1887F', marginTop: 4 },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B4226',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  listItem: {
    paddingVertical: 4,
  },
});
