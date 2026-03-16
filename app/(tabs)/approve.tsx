import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Card, Text, Button, Chip, Surface, Portal, Dialog, TextInput, RadioButton } from 'react-native-paper';
import { useStore } from '@/store/useStore';
import { Activity, PenaltyCategory, ChildInfo } from '@/types';
import { PENALTY_ACTIVITIES } from '@/constants/activities';
import { getCategoryLabel } from '@/constants/categoryNames';


export default function ApproveScreen() {
  const user = useStore((state) => state.user);
  const pendingApprovals = useStore((state) => state.pendingApprovals);
  const approveActivity = useStore((state) => state.approveActivity);
  const rejectActivity = useStore((state) => state.rejectActivity);
  const assignPenalty = useStore((state) => state.assignPenalty);

  // 중복 클릭 방지를 위한 처리 중인 활동 ID 추적
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  // 거절 확인 다이얼로그
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  // 벌금 부여 다이얼로그
  const [penaltyVisible, setPenaltyVisible] = useState(false);
  const [penaltyChildId, setPenaltyChildId] = useState<string>('');
  const [penaltyCategory, setPenaltyCategory] = useState<PenaltyCategory>('no_record');
  const [penaltyMemo, setPenaltyMemo] = useState('');
  const [penaltyLoading, setPenaltyLoading] = useState(false);
  const children: ChildInfo[] = user?.children || [];

  const openPenaltyDialog = () => {
    setPenaltyChildId(children.length > 0 ? children[0].id : '');
    setPenaltyCategory('no_record');
    setPenaltyMemo('');
    setPenaltyVisible(true);
  };

  const confirmPenalty = async () => {
    if (!penaltyChildId) return;
    setPenaltyLoading(true);
    const child = children.find(c => c.id === penaltyChildId);
    await assignPenalty(penaltyChildId, child?.name || '', penaltyCategory, penaltyMemo || undefined);
    setPenaltyLoading(false);
    setPenaltyVisible(false);
  };

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
                    {getCategoryLabel(activity.category)}
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
                    textColor="#8B3A3A"
                    disabled={processingIds.has(activity.id)}
                    loading={processingIds.has(activity.id)}
                  >
                    거절
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => handleApprove(activity.id)}
                    style={styles.approveButton}
                    buttonColor="#5D7B3A"
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

      {/* 벌금 부여 버튼 */}
      {children.length > 0 && (
        <View style={styles.penaltyButtonContainer}>
          <Button
            mode="contained"
            onPress={openPenaltyDialog}
            buttonColor="#6D2B2B"
            icon="alert-circle"
            style={styles.penaltyButton}
          >
            벌금 부여
          </Button>
        </View>
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
            <Button onPress={confirmReject} textColor="#6D2B2B">거절</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 벌금 부여 다이얼로그 */}
      <Portal>
        <Dialog visible={penaltyVisible} onDismiss={() => setPenaltyVisible(false)}>
          <Dialog.Title>벌금 부여</Dialog.Title>
          <Dialog.Content>
            {/* 자녀 선택 */}
            {children.length > 1 && (
              <View style={styles.penaltySection}>
                <Text variant="bodySmall" style={styles.penaltyLabel}>자녀 선택</Text>
                <View style={styles.penaltyChips}>
                  {children.map((child) => (
                    <Chip
                      key={child.id}
                      selected={penaltyChildId === child.id}
                      onPress={() => setPenaltyChildId(child.id)}
                      style={penaltyChildId === child.id ? styles.penaltyChipSelected : styles.penaltyChipDefault}
                      textStyle={penaltyChildId === child.id ? { color: '#FFFFFF' } : undefined}
                    >
                      {child.name}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
            {children.length === 1 && (
              <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                대상: {children[0].name}
              </Text>
            )}

            {/* 벌금 종류 */}
            <View style={styles.penaltySection}>
              <Text variant="bodySmall" style={styles.penaltyLabel}>벌금 종류</Text>
              <RadioButton.Group
                onValueChange={(value) => setPenaltyCategory(value as PenaltyCategory)}
                value={penaltyCategory}
              >
                {(Object.entries(PENALTY_ACTIVITIES) as [PenaltyCategory, { label: string; hours: number; description: string }][]).map(([key, info]) => (
                  <View key={key} style={styles.radioRow}>
                    <RadioButton value={key} />
                    <View style={styles.radioInfo}>
                      <Text style={styles.radioLabel}>{info.label} (-{info.hours}시간)</Text>
                      <Text variant="bodySmall" style={styles.radioDesc}>{info.description}</Text>
                    </View>
                  </View>
                ))}
              </RadioButton.Group>
            </View>

            {/* 메모 */}
            <TextInput
              label="메모 (선택)"
              value={penaltyMemo}
              onChangeText={setPenaltyMemo}
              mode="outlined"
              dense
              style={{ marginTop: 8 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPenaltyVisible(false)}>취소</Button>
            <Button
              onPress={confirmPenalty}
              textColor="#6D2B2B"
              loading={penaltyLoading}
              disabled={penaltyLoading || !penaltyChildId}
            >
              부여
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#3E2723',
  },
  countChip: {
    backgroundColor: '#EFEBE9',
  },
  emptyContainer: {
    margin: 16,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#A1887F',
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
    color: '#3E2723',
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
    borderBottomColor: '#EFEBE9',
  },
  detailLabel: {
    color: '#8D6E63',
  },
  detailValue: {
    color: '#3E2723',
    fontWeight: '500',
  },
  descriptionContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  descriptionLabel: {
    color: '#8D6E63',
    fontSize: 12,
    marginBottom: 4,
  },
  description: {
    color: '#3E2723',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  rejectButton: {
    flex: 1,
    borderColor: '#D4A59A',
  },
  approveButton: {
    flex: 1,
  },
  penaltyButtonContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  penaltyButton: {
    borderRadius: 12,
  },
  penaltySection: {
    marginBottom: 12,
  },
  penaltyLabel: {
    color: '#8D6E63',
    marginBottom: 8,
  },
  penaltyChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  penaltyChipDefault: {
    backgroundColor: '#EFEBE9',
  },
  penaltyChipSelected: {
    backgroundColor: '#6B4226',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  radioInfo: {
    flex: 1,
  },
  radioLabel: {
    color: '#3E2723',
    fontWeight: '500',
  },
  radioDesc: {
    color: '#A1887F',
    fontSize: 11,
  },
});
