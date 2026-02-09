import React from 'react';
import { StyleSheet, View, ScrollView, Alert, Platform } from 'react-native';
import { Card, Text, Button, Surface, Avatar } from 'react-native-paper';
import { router } from 'expo-router';
import { useStore, useTodayEarned, useTodaySpent, useTodayPenalty, useComputedBalance } from '@/store/useStore';

// 자녀 홈 화면
function ChildHomeScreen() {
  const user = useStore((state) => state.user);
  const todayEarned = useTodayEarned();
  const todaySpent = useTodaySpent();
  const todayPenalty = useTodayPenalty();

  const balance = useComputedBalance();
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
          onPress={() => router.push({ pathname: '/record', params: { type: 'earn' } })}
        >
          시간 벌기
        </Button>
        <Button
          mode="contained"
          icon="minus"
          style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
          contentStyle={styles.actionButtonContent}
          labelStyle={styles.actionButtonLabel}
          onPress={() => router.push({ pathname: '/record', params: { type: 'spend' } })}
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

  // 자녀 목록 (user.children에서 가져옴)
  // NOTE: 잔액 등 실시간 데이터는 DB 연동 후 조회 가능
  const children = (user?.children || []).map(child => ({
    ...child,
    pendingCount: pendingApprovals.filter(a => a.userId === child.id).length,
  }));
  const totalPending = pendingApprovals.length;

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

      {children.length === 0 && (
        <Surface style={styles.emptyChildContainer}>
          <Text style={styles.emptyChildText}>
            등록된 자녀가 없습니다.
          </Text>
          <Text style={styles.emptyChildHint}>
            '자녀 추가' 버튼을 눌러 자녀 계정을 추가하세요.
          </Text>
        </Surface>
      )}

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
                  <Text style={styles.childEmail}>
                    {child.email}
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

            {/* TODO: DB 연동 후 자녀 실시간 통계 표시 */}
          </Card.Content>
        </Card>
      ))}

      {/* 빠른 액션 */}
      <View style={styles.parentActions}>
        <Button
          mode="outlined"
          icon="account-plus"
          style={styles.parentActionButton}
          onPress={() => router.push('/(tabs)/add-child')}
        >
          자녀 추가
        </Button>
        <Button
          mode="outlined"
          icon="cash"
          style={styles.parentActionButton}
          onPress={() => {
            const message = '저금 교환 기능은 준비 중입니다.';
            if (Platform.OS === 'web') {
              window.alert(message);
            } else {
              Alert.alert('알림', message);
            }
          }}
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
  childEmail: {
    color: '#64748B',
    marginTop: 2,
    fontSize: 12,
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
  emptyChildContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyChildText: {
    color: '#64748B',
    fontSize: 16,
    marginBottom: 4,
  },
  emptyChildHint: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
