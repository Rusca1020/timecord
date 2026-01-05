import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Card, Text, Button, Chip, Surface } from 'react-native-paper';
import { useStore } from '@/store/useStore';
import { Activity } from '@/types';

// 카테고리 한글 이름
const categoryNames: Record<string, string> = {
  holiday_base: '휴일 기본',
  academy_study: '학원/과외 공부',
  academy_homework: '학원/과외 숙제',
  self_study: '스스로 공부',
  reading: '독서 + 독후감',
  good_deed: '좋은 일',
  coding: '코딩/AI',
  app_complete: '앱 완성',
  app_store: '앱스토어 등록',
};

// 더미 승인 대기 데이터
const dummyPendingActivities: Activity[] = [
  {
    id: '1',
    userId: 'child-1',
    date: new Date().toISOString().split('T')[0],
    type: 'earn',
    category: 'self_study',
    duration: 2,
    multiplier: 1.5,
    earnedTime: 3,
    startTime: '14:00',
    endTime: '16:00',
    description: '수학 문제집 풀기',
    requiresApproval: true,
    approverType: 'mom',
    approved: false,
    createdAt: new Date(),
  },
  {
    id: '2',
    userId: 'child-1',
    date: new Date().toISOString().split('T')[0],
    type: 'earn',
    category: 'coding',
    duration: 1,
    multiplier: 2,
    earnedTime: 2,
    startTime: '17:00',
    endTime: '18:00',
    description: 'React Native 공부',
    requiresApproval: true,
    approverType: 'dad',
    approved: false,
    createdAt: new Date(),
  },
  {
    id: '3',
    userId: 'child-1',
    date: new Date().toISOString().split('T')[0],
    type: 'earn',
    category: 'reading',
    duration: 1,
    multiplier: 1.5,
    earnedTime: 1.5,
    description: '해리포터 읽고 독후감 작성',
    requiresApproval: true,
    approverType: 'mom',
    approved: false,
    createdAt: new Date(),
  },
];

export default function ApproveScreen() {
  const user = useStore((state) => state.user);
  const pendingApprovals = useStore((state) => state.pendingApprovals);
  const updateActivity = useStore((state) => state.updateActivity);

  // 더미 데이터 사용 (실제로는 pendingApprovals 사용)
  const activities = pendingApprovals.length > 0 ? pendingApprovals : dummyPendingActivities;

  const handleApprove = (activityId: string) => {
    updateActivity(activityId, {
      approved: true,
      approvedBy: user?.id,
      approvedAt: new Date(),
    });
  };

  const handleReject = (activityId: string) => {
    // 거절 시 활동 삭제 또는 상태 변경
  };

  const formatTime = (start?: string, end?: string) => {
    if (start && end) return `${start} ~ ${end}`;
    return '';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          승인 대기
        </Text>
        <Chip style={styles.countChip}>
          {activities.filter(a => !a.approved).length}건
        </Chip>
      </View>

      {activities.filter(a => !a.approved).length === 0 ? (
        <Surface style={styles.emptyContainer}>
          <Text style={styles.emptyText}>승인 대기 중인 활동이 없습니다</Text>
        </Surface>
      ) : (
        activities
          .filter(a => !a.approved)
          .map((activity) => (
            <Card key={activity.id} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text variant="titleMedium" style={styles.categoryName}>
                    {categoryNames[activity.category] || activity.category}
                  </Text>
                  <Chip
                    compact
                    style={[
                      styles.approverChip,
                      activity.approverType === 'mom'
                        ? styles.momChip
                        : styles.dadChip
                    ]}
                  >
                    {activity.approverType === 'mom' ? '엄마 확인' : '아빠 확인'}
                  </Chip>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>활동 시간</Text>
                  <Text style={styles.detailValue}>
                    {activity.duration}시간 × {activity.multiplier}배 = {activity.earnedTime}시간
                  </Text>
                </View>

                {activity.startTime && activity.endTime && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>시간대</Text>
                    <Text style={styles.detailValue}>
                      {formatTime(activity.startTime, activity.endTime)}
                    </Text>
                  </View>
                )}

                {activity.description && (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>메모</Text>
                    <Text style={styles.description}>{activity.description}</Text>
                  </View>
                )}

                <View style={styles.buttonContainer}>
                  <Button
                    mode="outlined"
                    onPress={() => handleReject(activity.id)}
                    style={styles.rejectButton}
                    textColor="#EF4444"
                  >
                    거절
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => handleApprove(activity.id)}
                    style={styles.approveButton}
                    buttonColor="#10B981"
                  >
                    승인
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))
      )}
    </ScrollView>
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
  title: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  countChip: {
    backgroundColor: '#EEF2FF',
  },
  emptyContainer: {
    margin: 16,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  approverChip: {
    height: 28,
  },
  momChip: {
    backgroundColor: '#FCE7F3',
  },
  dadChip: {
    backgroundColor: '#DBEAFE',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    color: '#64748B',
  },
  detailValue: {
    color: '#1E293B',
    fontWeight: '500',
  },
  descriptionContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  descriptionLabel: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 4,
  },
  description: {
    color: '#1E293B',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  rejectButton: {
    flex: 1,
    borderColor: '#FCA5A5',
  },
  approveButton: {
    flex: 1,
  },
});
