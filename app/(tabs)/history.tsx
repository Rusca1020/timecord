import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Chip, Surface, SegmentedButtons, Searchbar } from 'react-native-paper';
import { useStore } from '@/store/useStore';
import { EARN_ACTIVITIES, SPEND_ACTIVITIES, PENALTY_ACTIVITIES, NEUTRAL_ACTIVITIES } from '@/constants/activities';
import { Activity, EarnCategory, SpendCategory, PenaltyCategory, NeutralCategory } from '@/types';

type FilterType = 'all' | 'earn' | 'spend' | 'penalty';

export default function HistoryScreen() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const activities = useStore((state) => state.activities);
  const user = useStore((state) => state.user);
  const isParent = user?.role === 'parent';

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

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // 타입 필터
      if (filter !== 'all' && activity.type !== filter) return false;

      // 검색 필터
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const label = getActivityLabel(activity).toLowerCase();
        const userName = (activity.userName || '').toLowerCase();
        const description = (activity.description || '').toLowerCase();

        return label.includes(query) ||
               userName.includes(query) ||
               description.includes(query);
      }

      return true;
    });
  }, [activities, filter, searchQuery]);

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
          {isParent && activity.userName && (
            <Text variant="bodySmall" style={styles.userNameText}>
              {activity.userName}
            </Text>
          )}
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
      {/* 검색 */}
      <Searchbar
        placeholder={isParent ? "이름, 활동, 메모 검색" : "활동, 메모 검색"}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

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
        {sortedDates.map((date) => {
          const dateActivities = groupedActivities[date];

          if (isParent) {
            // 부모: 자녀별로 분리
            const byChild: Record<string, { name: string; activities: Activity[] }> = {};
            dateActivities.forEach(a => {
              const key = a.userId;
              if (!byChild[key]) byChild[key] = { name: a.userName || '알 수 없음', activities: [] };
              byChild[key].activities.push(a);
            });

            return (
              <View key={date} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <Text variant="titleMedium" style={styles.dateText}>
                    {formatDate(date)}
                    {isToday(date) && <Text style={styles.todayBadge}> 오늘</Text>}
                  </Text>
                </View>
                {Object.entries(byChild).map(([childId, { name, activities: childActs }]) => {
                  const earned = childActs.filter(a => a.type === 'earn' && a.approved).reduce((s, a) => s + a.earnedTime, 0);
                  const spent = childActs.filter(a => a.type === 'spend').reduce((s, a) => s + a.duration, 0);
                  return (
                    <View key={childId} style={styles.childGroup}>
                      <View style={styles.childGroupHeader}>
                        <Text variant="bodyMedium" style={styles.childGroupName}>{name}</Text>
                        <Text variant="bodySmall" style={styles.summaryText}>
                          {earned.toFixed(1)}시간 벌기 / {spent.toFixed(1)}시간 쓰기
                        </Text>
                      </View>
                      {childActs.map(renderActivityItem)}
                    </View>
                  );
                })}
              </View>
            );
          }

          // 자녀: 기존 방식
          return (
            <View key={date} style={styles.dateGroup}>
              <View style={styles.dateHeader}>
                <Text variant="titleMedium" style={styles.dateText}>
                  {formatDate(date)}
                  {isToday(date) && <Text style={styles.todayBadge}> 오늘</Text>}
                </Text>
                <Text variant="bodySmall" style={styles.summaryText}>
                  {dateActivities.filter(a => a.type === 'earn' && a.approved).reduce((sum, a) => sum + a.earnedTime, 0).toFixed(1)}시간 벌기 /
                  {dateActivities.filter(a => a.type === 'spend').reduce((sum, a) => sum + a.duration, 0).toFixed(1)}시간 쓰기
                </Text>
              </View>
              {dateActivities.map(renderActivityItem)}
            </View>
          );
        })}
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
  searchBar: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  filter: {
    marginHorizontal: 16,
    marginBottom: 16,
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
  userNameText: {
    color: '#6366F1',
    fontWeight: '500',
    marginBottom: 2,
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
  childGroup: {
    marginBottom: 8,
  },
  childGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
    marginTop: 4,
  },
  childGroupName: {
    fontWeight: '600',
    color: '#6366F1',
  },
});
