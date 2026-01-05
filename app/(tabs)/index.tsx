import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Card, Text, Button, Surface, Avatar } from 'react-native-paper';
import { router } from 'expo-router';
import { useStore, useTodayEarned, useTodaySpent, useTodayPenalty } from '@/store/useStore';

// 자녀 홈 화면
function ChildHomeScreen() {
  const user = useStore((state) => state.user);
  const todayEarned = useTodayEarned();
  const todaySpent = useTodaySpent();
  const todayPenalty = useTodayPenalty();

  const balance = user?.balance ?? 5.5;
  const today = new Date();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const isHoliday = today.getDay() === 0 || today.getDay() === 6;

  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayName = dayNames[date.getDay()];
    return `${month}/${day} ${dayName}요일`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* 오늘 날짜 */}
      <View style={styles.dateContainer}>
        <Text variant="titleMedium" style={styles.dateText}>
          {formatDate(today)}
          {isHoliday && <Text style={styles.holidayBadge}> 휴일</Text>}
        </Text>
      </View>

      {/* 잔액 카드 */}
      <Card style={styles.balanceCard}>
        <Card.Content style={styles.balanceContent}>
          <Text variant="titleMedium" style={styles.balanceLabel}>
            현재 잔액
          </Text>
          <Text variant="displayMedium" style={styles.balanceValue}>
            {balance.toFixed(1)}
            <Text style={styles.balanceUnit}> 시간</Text>
          </Text>
        </Card.Content>
      </Card>

      {/* 오늘 요약 */}
      <View style={styles.summaryContainer}>
        <Surface style={[styles.summaryCard, { backgroundColor: '#ECFDF5' }]}>
          <Text style={[styles.summaryLabel, { color: '#059669' }]}>번 시간</Text>
          <Text style={[styles.summaryValue, { color: '#059669' }]}>
            +{todayEarned.toFixed(1)}
          </Text>
        </Surface>
        <Surface style={[styles.summaryCard, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.summaryLabel, { color: '#D97706' }]}>쓴 시간</Text>
          <Text style={[styles.summaryValue, { color: '#D97706' }]}>
            -{todaySpent.toFixed(1)}
          </Text>
        </Surface>
        <Surface style={[styles.summaryCard, { backgroundColor: '#FEE2E2' }]}>
          <Text style={[styles.summaryLabel, { color: '#DC2626' }]}>벌금</Text>
          <Text style={[styles.summaryValue, { color: '#DC2626' }]}>
            -{todayPenalty.toFixed(1)}
          </Text>
        </Surface>
      </View>

      {/* 빠른 기록 버튼 */}
      <View style={styles.quickActions}>
        <Button
          mode="contained"
          icon="plus"
          style={[styles.actionButton, { backgroundColor: '#10B981' }]}
          contentStyle={styles.actionButtonContent}
          labelStyle={styles.actionButtonLabel}
          onPress={() => router.push('/record')}
        >
          시간 벌기
        </Button>
        <Button
          mode="contained"
          icon="minus"
          style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
          contentStyle={styles.actionButtonContent}
          labelStyle={styles.actionButtonLabel}
          onPress={() => router.push('/record')}
        >
          시간 쓰기
        </Button>
      </View>

      {/* 저금 교환 정보 */}
      <Card style={styles.exchangeCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.exchangeTitle}>
            저금 교환
          </Text>
          <Text variant="bodyMedium" style={styles.exchangeInfo}>
            10시간 = 3만원 (시간당 3천원)
          </Text>
          <Text variant="bodySmall" style={styles.exchangeHint}>
            현재 잔액으로 {Math.floor(balance / 10) * 30000}원 교환 가능
          </Text>
        </Card.Content>
      </Card>

      {/* 규칙 안내 */}
      <Card style={styles.rulesCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.rulesTitle}>
            벌금 규칙
          </Text>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleText}>기록 안함</Text>
            <Text style={styles.rulePenalty}>-1시간</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleText}>잔액 없이 게임/유튜브</Text>
            <Text style={styles.rulePenalty}>-2시간</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleText}>거짓 기록</Text>
            <Text style={styles.rulePenalty}>-10시간</Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

// 더미 자녀 데이터
const dummyChildren = [
  {
    id: 'child-1',
    name: '홍길동',
    balance: 15.5,
    todayEarned: 3.0,
    todaySpent: 1.0,
    pendingCount: 2,
  },
];

// 부모 홈 화면
function ParentHomeScreen() {
  const user = useStore((state) => state.user);
  const pendingApprovals = useStore((state) => state.pendingApprovals);

  const today = new Date();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayName = dayNames[date.getDay()];
    return `${month}/${day} ${dayName}요일`;
  };

  // 더미 데이터 또는 실제 데이터 사용
  const children = dummyChildren;
  const totalPending = pendingApprovals.length || 3; // 더미: 3건

  return (
    <ScrollView style={styles.container}>
      {/* 오늘 날짜 */}
      <View style={styles.dateContainer}>
        <Text variant="titleMedium" style={styles.dateText}>
          {formatDate(today)}
        </Text>
      </View>

      {/* 승인 대기 알림 */}
      {totalPending > 0 && (
        <Card style={styles.pendingCard} onPress={() => router.push('/approve')}>
          <Card.Content style={styles.pendingContent}>
            <View style={styles.pendingInfo}>
              <Text variant="titleMedium" style={styles.pendingTitle}>
                승인 대기
              </Text>
              <Text style={styles.pendingCount}>{totalPending}건</Text>
            </View>
            <Button
              mode="contained"
              compact
              onPress={() => router.push('/approve')}
              style={styles.pendingButton}
            >
              확인하기
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* 자녀 현황 */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        자녀 현황
      </Text>

      {children.map((child) => (
        <Card key={child.id} style={styles.childCard}>
          <Card.Content>
            <View style={styles.childHeader}>
              <View style={styles.childInfo}>
                <Avatar.Text
                  size={48}
                  label={child.name.charAt(0)}
                  style={styles.childAvatar}
                />
                <View>
                  <Text variant="titleMedium" style={styles.childName}>
                    {child.name}
                  </Text>
                  <Text style={styles.childBalance}>
                    잔액: {child.balance.toFixed(1)}시간
                  </Text>
                </View>
              </View>
              {child.pendingCount > 0 && (
                <Surface style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>
                    {child.pendingCount}건 대기
                  </Text>
                </Surface>
              )}
            </View>

            <View style={styles.childStats}>
              <View style={styles.childStatItem}>
                <Text style={styles.childStatLabel}>오늘 번 시간</Text>
                <Text style={[styles.childStatValue, { color: '#10B981' }]}>
                  +{child.todayEarned.toFixed(1)}
                </Text>
              </View>
              <View style={styles.childStatItem}>
                <Text style={styles.childStatLabel}>오늘 쓴 시간</Text>
                <Text style={[styles.childStatValue, { color: '#F59E0B' }]}>
                  -{child.todaySpent.toFixed(1)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      ))}

      {/* 빠른 액션 */}
      <View style={styles.parentActions}>
        <Button
          mode="outlined"
          icon="account-plus"
          style={styles.parentActionButton}
          onPress={() => {}}
        >
          자녀 추가
        </Button>
        <Button
          mode="outlined"
          icon="cash"
          style={styles.parentActionButton}
          onPress={() => {}}
        >
          저금 교환
        </Button>
      </View>
    </ScrollView>
  );
}

export default function HomeScreen() {
  const user = useStore((state) => state.user);
  const isParent = user?.role === 'parent';

  return isParent ? <ParentHomeScreen /> : <ChildHomeScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  dateContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  dateText: {
    color: '#64748B',
  },
  holidayBadge: {
    color: '#6366F1',
    fontWeight: 'bold',
  },
  balanceCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#6366F1',
    borderRadius: 16,
  },
  balanceContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  balanceLabel: {
    color: '#C7D2FE',
  },
  balanceValue: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 8,
  },
  balanceUnit: {
    fontSize: 20,
    fontWeight: 'normal',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
  actionButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  exchangeCard: {
    margin: 16,
    borderRadius: 12,
  },
  exchangeTitle: {
    marginBottom: 8,
  },
  exchangeInfo: {
    color: '#6366F1',
    fontWeight: '500',
  },
  exchangeHint: {
    color: '#94A3B8',
    marginTop: 4,
  },
  rulesCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    marginBottom: 32,
  },
  rulesTitle: {
    marginBottom: 12,
    color: '#EF4444',
  },
  ruleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ruleText: {
    color: '#64748B',
  },
  rulePenalty: {
    color: '#EF4444',
    fontWeight: '500',
  },
  // 부모 홈 스타일
  pendingCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  pendingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingTitle: {
    color: '#92400E',
  },
  pendingCount: {
    color: '#D97706',
    fontWeight: 'bold',
    fontSize: 18,
  },
  pendingButton: {
    backgroundColor: '#F59E0B',
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  childCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  childHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  childInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  childAvatar: {
    backgroundColor: '#6366F1',
  },
  childName: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  childBalance: {
    color: '#64748B',
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingBadgeText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
  },
  childStats: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 16,
  },
  childStatItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  childStatLabel: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 4,
  },
  childStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  parentActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  parentActionButton: {
    flex: 1,
    borderColor: '#E2E8F0',
  },
});
