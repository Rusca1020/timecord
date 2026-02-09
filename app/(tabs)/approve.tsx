import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Card, Text, Button, Chip, Surface, Portal, Dialog } from 'react-native-paper';
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


export default function ApproveScreen() {
  const user = useStore((state) => state.user);
  const pendingApprovals = useStore((state) => state.pendingApprovals);
  const approveActivity = useStore((state) => state.approveActivity);
  const rejectActivity = useStore((state) => state.rejectActivity);

  // 중복 클릭 방지를 위한 처리 중인 활동 ID 추적
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  // 거절 확인 다이얼로그
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  const activities = pendingApprovals;

  const handleApprove = async (activityId: string) => {
    // 이미 처리 중이면 무시
    if (processingIds.has(activityId)) return;

    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    // 처리 시작
    setProcessingIds(prev => new Set(prev).add(activityId));

    try {
      // 활동 승인 처리 (Supabase에 저장)
      await approveActivity(activityId);
    } finally {
      // 처리 완료
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
    }
  };

  const handleReject = (activityId: string) => {
    setRejectTargetId(activityId);
  };

  const confirmReject = async () => {
    if (!rejectTargetId) return;
    const activityId = rejectTargetId;
    setRejectTargetId(null);

    // 이미 처리 중이면 무시
    if (processingIds.has(activityId)) return;

    // 처리 시작
    setProcessingIds(prev => new Set(prev).add(activityId));

    try {
      // 거절 시 알림 + 활동 삭제
      await rejectActivity(activityId);
    } finally {
      // 처리 완료
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
    }
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
                    disabled={processingIds.has(activity.id)}
                    loading={processingIds.has(activity.id)}
                  >
                    거절
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => handleApprove(activity.id)}
                    style={styles.approveButton}
                    buttonColor="#10B981"
                    disabled={processingIds.has(activity.id)}
                    loading={processingIds.has(activity.id)}
                  >
                    승인
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))
      )}

      {/* 거절 확인 다이얼로그 */}
      <Portal>
        <Dialog visible={rejectTargetId !== null} onDismiss={() => setRejectTargetId(null)}>
          <Dialog.Title>거절 확인</Dialog.Title>
          <Dialog.Content>
            <Text>이 활동을 거절하시겠습니까? 거절하면 삭제됩니다.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRejectTargetId(null)}>취소</Button>
            <Button onPress={confirmReject} textColor="#DC2626">거절</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
