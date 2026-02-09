import React, { useCallback } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Surface, Button, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { useStore } from '@/store/useStore';
import { AppNotification } from '@/types';

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function NotificationsScreen() {
  const notifications = useStore((state) => state.notifications);
  const unreadCount = useStore((state) => state.unreadNotificationCount);
  const markNotificationRead = useStore((state) => state.markNotificationRead);
  const markAllNotificationsRead = useStore((state) => state.markAllNotificationsRead);
  const loadNotifications = useStore((state) => state.loadNotifications);
  const user = useStore((state) => state.user);

  const handlePress = useCallback(async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
    }
    // 알림 타입에 따라 이동
    if (notification.type === 'approval_request') {
      router.push('/approve');
    } else {
      router.push('/history');
    }
  }, [markNotificationRead]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllNotificationsRead();
  }, [markAllNotificationsRead]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'approval_request': return 'clock-outline';
      case 'approved': return 'check-circle-outline';
      case 'rejected': return 'close-circle-outline';
      default: return 'bell-outline';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'approval_request': return '#6366F1';
      case 'approved': return '#059669';
      case 'rejected': return '#DC2626';
      default: return '#64748B';
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="titleLarge" style={styles.title}>알림</Text>
          {unreadCount > 0 && (
            <Surface style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </Surface>
          )}
        </View>
        {unreadCount > 0 && (
          <Button
            mode="text"
            compact
            onPress={handleMarkAllRead}
            labelStyle={styles.markAllReadLabel}
          >
            모두 읽음
          </Button>
        )}
      </View>

      {/* 알림 목록 */}
      <ScrollView style={styles.list}>
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>알림이 없습니다</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <Surface
              key={notification.id}
              style={[
                styles.notificationItem,
                !notification.isRead && styles.unreadItem,
              ]}
              onTouchEnd={() => handlePress(notification)}
            >
              <View style={styles.notificationContent}>
                <View style={[styles.iconContainer, { backgroundColor: getTypeColor(notification.type) + '1A' }]}>
                  <IconButton
                    icon={getTypeIcon(notification.type)}
                    iconColor={getTypeColor(notification.type)}
                    size={20}
                    style={styles.icon}
                  />
                </View>
                <View style={styles.textContainer}>
                  <View style={styles.titleRow}>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.notificationTitle,
                        !notification.isRead && styles.unreadTitle,
                      ]}
                    >
                      {notification.title}
                    </Text>
                    <Text variant="bodySmall" style={styles.timeText}>
                      {timeAgo(notification.createdAt)}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.bodyText} numberOfLines={2}>
                    {notification.body}
                  </Text>
                  {notification.senderName && (
                    <Text variant="bodySmall" style={styles.senderText}>
                      {notification.senderName}
                    </Text>
                  )}
                </View>
                {!notification.isRead && <View style={styles.unreadDot} />}
              </View>
            </Surface>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    elevation: 0,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllReadLabel: {
    color: '#6366F1',
    fontSize: 13,
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  notificationItem: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  unreadItem: {
    backgroundColor: '#F0F0FF',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    margin: 0,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  notificationTitle: {
    fontWeight: '500',
    color: '#334155',
  },
  unreadTitle: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  timeText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  bodyText: {
    color: '#64748B',
    lineHeight: 18,
  },
  senderText: {
    color: '#6366F1',
    fontSize: 11,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
    marginTop: 4,
    marginLeft: 8,
  },
});
