import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, FlatList } from 'react-native';
import { Card, Text, Chip, Surface, SegmentedButtons } from 'react-native-paper';
import { useStore } from '@/store/useStore';
import { EARN_ACTIVITIES, SPEND_ACTIVITIES, PENALTY_ACTIVITIES, NEUTRAL_ACTIVITIES } from '@/constants/activities';
import { Activity, EarnCategory, SpendCategory, PenaltyCategory, NeutralCategory } from '@/types';

type FilterType = 'all' | 'earn' | 'spend' | 'penalty';

// 데모 데이터
const DEMO_ACTIVITIES: Activity[] = [
  {
    id: '1',
    userId: 'demo',
    date: new Date().toISOString().split('T')[0],
    type: 'earn',
    category: 'academy_study',
    duration: 3,
    multiplier: 1,
    earnedTime: 3,
    startTime: '15:00',
    endTime: '18:00',
    description: '수학 학원',
    requiresApproval: false,
    approved: true,
    createdAt: new Date(),
  },
  {
    id: '2',
    userId: 'demo',
    date: new Date().toISOString().split('T')[0],
    type: 'earn',
    category: 'academy_homework',
    duration: 2,
    multiplier: 1,
    earnedTime: 2,
    startTime: '19:00',
    endTime: '21:00',
    description: '수학 숙제',
    requiresApproval: false,
    approved: true,
    createdAt: new Date(),
  },
  {
    id: '3',
    userId: 'demo',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    type: 'spend',
    category: 'game',
    duration: 1.5,
    multiplier: 1,
    earnedTime: 1.5,
    description: '마인크래프트',
    requiresApproval: false,
    approved: true,
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: '4',
    userId: 'demo',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    type: 'earn',
    category: 'coding',
    duration: 2,
    multiplier: 2,
    earnedTime: 4,
    startTime: '14:00',
    endTime: '16:00',
    description: 'Python 공부',
    requiresApproval: true,
    approverType: 'dad',
    approved: true,
    createdAt: new Date(Date.now() - 86400000),
  },
];

export default function HistoryScreen() {
  const [filter, setFilter] = useState<FilterType>('all');
  const activities = useStore((state) => state.activities);

  // 데모용으로 활동이 없으면 데모 데이터 사용
  const displayActivities = activities.length > 0 ? activities : DEMO_ACTIVITIES;

  const filteredActivities = displayActivities.filter((activity) => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  // 날짜별로 그룹화
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = activity.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, Activity[]>);

  const sortedDates = Object.keys(groupedActivities).sort((a, b) => b.localeCompare(a));

  const getActivityLabel = (activity: Activity) => {
    if (activity.type === 'earn') {
      return EARN_ACTIVITIES[activity.category as EarnCategory]?.label || activity.category;
    } else if (activity.type === 'spend') {
      return SPEND_ACTIVITIES[activity.category as SpendCategory]?.label || activity.category;
    } else if (activity.type === 'penalty') {
      return PENALTY_ACTIVITIES[activity.category as PenaltyCategory]?.label || activity.category;
    } else {
      return NEUTRAL_ACTIVITIES[activity.category as NeutralCategory]?.label || activity.category;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${month}/${day} ${dayName}요일`;
  };

  const isToday = (dateStr: string) => {
    return dateStr === new Date().toISOString().split('T')[0];
  };

  const renderActivityItem = (activity: Activity) => {
    const isEarn = activity.type === 'earn';
    const isSpend = activity.type === 'spend';
    const isPenalty = activity.type === 'penalty';

    return (
      <Surface key={activity.id} style={styles.activityItem}>
        <View style={styles.activityHeader}>
          <Chip
            compact
            style={[
              styles.typeChip,
              isEarn && styles.earnChip,
              isSpend && styles.spendChip,
              isPenalty && styles.penaltyChip,
            ]}
            textStyle={styles.chipText}
          >
            {isEarn ? '벌기' : isSpend ? '쓰기' : isPenalty ? '벌금' : '중립'}
          </Chip>
          <Text variant="bodyMedium" style={styles.activityLabel}>
            {getActivityLabel(activity)}
          </Text>
        </View>
        <View style={styles.activityDetails}>
          {activity.startTime && activity.endTime && (
            <Text variant="bodySmall" style={styles.timeText}>
              {activity.startTime} - {activity.endTime}
            </Text>
          )}
          {activity.description && (
            <Text variant="bodySmall" style={styles.descriptionText}>
              {activity.description}
            </Text>
          )}
        </View>
        <View style={styles.activityTime}>
          <Text
            variant="titleMedium"
            style={[
              styles.timeValue,
              isEarn && styles.earnText,
              isSpend && styles.spendText,
              isPenalty && styles.penaltyText,
            ]}
          >
            {isEarn ? '+' : '-'}{activity.earnedTime.toFixed(1)}시간
          </Text>
          {!activity.approved && (
            <Text variant="bodySmall" style={styles.pendingText}>승인 대기</Text>
          )}
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      {/* 필터 */}
      <SegmentedButtons
        value={filter}
        onValueChange={(value) => setFilter(value as FilterType)}
        buttons={[
          { value: 'all', label: '전체' },
          { value: 'earn', label: '벌기' },
          { value: 'spend', label: '쓰기' },
          { value: 'penalty', label: '벌금' },
        ]}
        style={styles.filter}
      />

      {/* 활동 목록 */}
      <ScrollView style={styles.listContainer}>
        {sortedDates.map((date) => (
          <View key={date} style={styles.dateGroup}>
            <View style={styles.dateHeader}>
              <Text variant="titleMedium" style={styles.dateText}>
                {formatDate(date)}
                {isToday(date) && <Text style={styles.todayBadge}> 오늘</Text>}
              </Text>
              <Text variant="bodySmall" style={styles.summaryText}>
                {groupedActivities[date].filter(a => a.type === 'earn' && a.approved).reduce((sum, a) => sum + a.earnedTime, 0).toFixed(1)}시간 벌기 /
                {groupedActivities[date].filter(a => a.type === 'spend').reduce((sum, a) => sum + a.earnedTime, 0).toFixed(1)}시간 쓰기
              </Text>
            </View>
            {groupedActivities[date].map(renderActivityItem)}
          </View>
        ))}
        {sortedDates.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              기록이 없습니다
            </Text>
          </View>
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
  filter: {
    margin: 16,
  },
  listContainer: {
    flex: 1,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  dateText: {
    color: '#334155',
  },
  todayBadge: {
    color: '#6366F1',
    fontWeight: 'bold',
  },
  summaryText: {
    color: '#94A3B8',
    marginTop: 2,
  },
  activityItem: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeChip: {
    marginRight: 8,
  },
  earnChip: {
    backgroundColor: '#ECFDF5',
  },
  spendChip: {
    backgroundColor: '#FEF3C7',
  },
  penaltyChip: {
    backgroundColor: '#FEE2E2',
  },
  chipText: {
    fontSize: 12,
  },
  activityLabel: {
    flex: 1,
    fontWeight: '500',
  },
  activityDetails: {
    marginBottom: 8,
  },
  timeText: {
    color: '#64748B',
  },
  descriptionText: {
    color: '#94A3B8',
    marginTop: 2,
  },
  activityTime: {
    alignItems: 'flex-end',
  },
  timeValue: {
    fontWeight: 'bold',
  },
  earnText: {
    color: '#059669',
  },
  spendText: {
    color: '#D97706',
  },
  penaltyText: {
    color: '#DC2626',
  },
  pendingText: {
    color: '#6366F1',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#94A3B8',
  },
});
