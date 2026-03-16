import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { Card, Text, Button, Surface, Avatar, Chip, ProgressBar } from 'react-native-paper';
import { router } from 'expo-router';
import { BarChart } from 'react-native-chart-kit';
import { useStore, useTodayEarned, useTodaySpent, useTodayPenalty, useComputedBalance } from '@/store/useStore';
import { EXCHANGE_RATE } from '@/constants/activities';
import { getCategoryLabel } from '@/constants/categoryNames';
import { Activity, ChildInfo } from '@/types';

const screenWidth = Dimensions.get('window').width;

// 연속 기록일 수 계산
function getStreak(activities: Activity[]): number {
  if (activities.length === 0) return 0;
  const dates = [...new Set(activities.map(a => a.date))].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // 오늘 또는 어제 기록이 없으면 스트릭 0
  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 0;
  let checkDate = new Date(dates[0]);
  const dateSet = new Set(dates);

  while (dateSet.has(checkDate.toISOString().split('T')[0])) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

// 주간 데이터 계산
function getWeeklyMiniData(activities: Activity[]) {
  const today = new Date();
  const earned: number[] = [];
  const spent: number[] = [];
  const labels: string[] = [];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    labels.push(dayNames[date.getDay()]);
    const dayActs = activities.filter(a => a.date === dateStr);
    earned.push(dayActs.filter(a => a.type === 'earn' && a.approved).reduce((s, a) => s + a.earnedTime, 0));
    spent.push(dayActs.filter(a => a.type === 'spend').reduce((s, a) => s + a.duration, 0));
  }
  return { labels, earned, spent };
}

// 자녀별 통계 계산
function computeChildStats(activities: Activity[], childId: string) {
  const childActivities = activities.filter(a => a.userId === childId);
  const earned = childActivities.filter(a => a.type === 'earn' && a.approved).reduce((s, a) => s + a.earnedTime, 0);
  const spent = childActivities.filter(a => a.type === 'spend').reduce((s, a) => s + a.duration, 0);
  const penalty = childActivities.filter(a => a.type === 'penalty').reduce((s, a) => s + a.earnedTime, 0);
  const exchanged = childActivities.filter(a => a.type === 'exchange').reduce((s, a) => s + a.duration, 0);
  const pending = childActivities.filter(a => !a.approved && a.requiresApproval).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayActs = childActivities.filter(a => a.date === todayStr);
  const todayEarned = todayActs.filter(a => a.type === 'earn' && a.approved).reduce((s, a) => s + a.earnedTime, 0);
  const todaySpent = todayActs.filter(a => a.type === 'spend').reduce((s, a) => s + a.duration, 0);

  return {
    balance: earned - spent - penalty - exchanged,
    earned, spent, pending,
    todayEarned, todaySpent,
    streak: getStreak(childActivities),
  };
}

// ========== 자녀 홈 화면 ==========
function ChildHomeScreen() {
  const user = useStore((state) => state.user);
  const activities = useStore((state) => state.activities);
  const exchanges = useStore((state) => state.exchanges);
  const loadActivities = useStore((state) => state.loadActivities);
  const loadExchanges = useStore((state) => state.loadExchanges);
  const todayEarned = useTodayEarned();
  const todaySpent = useTodaySpent();
  const todayPenalty = useTodayPenalty();
  const balance = useComputedBalance();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadActivities(), loadExchanges()]);
    setRefreshing(false);
  }, [loadActivities, loadExchanges]);

  const today = new Date();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const isHoliday = today.getDay() === 0 || today.getDay() === 6;

  const streak = useMemo(() => getStreak(activities), [activities]);
  const weekly = useMemo(() => getWeeklyMiniData(activities), [activities]);
  const recentActivities = useMemo(() => activities.slice(0, 3), [activities]);
  const pendingCount = useMemo(() => activities.filter(a => !a.approved && a.requiresApproval).length, [activities]);
  const pendingExchangeCount = useMemo(() => exchanges.filter(e => e.status === 'pending').length, [exchanges]);

  const exchangeProgress = Math.min((balance % EXCHANGE_RATE.hours) / EXCHANGE_RATE.hours, 1);
  const hoursToNextExchange = balance >= EXCHANGE_RATE.hours ? 0 : EXCHANGE_RATE.hours - balance;
  const exchangeCount = Math.floor(balance / EXCHANGE_RATE.hours);

  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayName = dayNames[date.getDay()];
    return `${month}/${day} ${dayName}요일`;
  };

  const weeklyHasData = weekly.earned.some(v => v > 0) || weekly.spent.some(v => v > 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6B4226']} />}
    >
      {/* 날짜 + 스트릭 */}
      <View style={styles.dateContainer}>
        <Text variant="titleMedium" style={styles.dateText}>
          {formatDate(today)}
          {isHoliday && <Text style={styles.holidayBadge}> 휴일</Text>}
        </Text>
        {streak > 0 && (
          <Chip compact icon="fire" style={styles.streakChip} textStyle={styles.streakText}>
            {streak}일 연속
          </Chip>
        )}
      </View>

      {/* 잔액 카드 + 교환 진행률 */}
      <Card style={styles.balanceCard}>
        <Card.Content style={styles.balanceContent}>
          <Text variant="titleMedium" style={styles.balanceLabel}>현재 잔액</Text>
          <Text variant="displayMedium" style={styles.balanceValue}>
            {balance.toFixed(1)}
            <Text style={styles.balanceUnit}> 시간</Text>
          </Text>

          {/* 다음 교환까지 진행률 */}
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={balance >= EXCHANGE_RATE.hours ? 1 : balance / EXCHANGE_RATE.hours}
              color="#A5B4FC"
              style={styles.progressBar}
            />
            <Text style={styles.progressText}>
              {balance >= EXCHANGE_RATE.hours
                ? `${exchangeCount}회 교환 가능 (${(exchangeCount * EXCHANGE_RATE.amount).toLocaleString()}원)`
                : `다음 교환까지 ${hoursToNextExchange.toFixed(1)}시간`}
            </Text>
          </View>

          {/* 승인 대기 / 교환 대기 상태 */}
          <View style={styles.statusRow}>
            {pendingCount > 0 && (
              <Chip compact icon="clock-outline" style={styles.pendingChipChild} textStyle={{ color: '#6B4226', fontSize: 12 }}>
                승인 대기 {pendingCount}건
              </Chip>
            )}
            {pendingExchangeCount > 0 && (
              <Chip compact icon="cash-clock" style={styles.exchangePendingChip} textStyle={{ color: '#6B4226', fontSize: 12 }}>
                교환 대기 {pendingExchangeCount}건
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* 오늘 요약 */}
      <View style={styles.summaryContainer}>
        <Surface style={[styles.summaryCard, { backgroundColor: '#E8F0E0' }]}>
          <Text style={[styles.summaryLabel, { color: '#4A6B2E' }]}>번 시간</Text>
          <Text style={[styles.summaryValue, { color: '#4A6B2E' }]}>+{todayEarned.toFixed(1)}</Text>
        </Surface>
        <Surface style={[styles.summaryCard, { backgroundColor: '#F5ECD7' }]}>
          <Text style={[styles.summaryLabel, { color: '#A67B4B' }]}>쓴 시간</Text>
          <Text style={[styles.summaryValue, { color: '#A67B4B' }]}>-{todaySpent.toFixed(1)}</Text>
        </Surface>
        <Surface style={[styles.summaryCard, { backgroundColor: '#F0D6D6' }]}>
          <Text style={[styles.summaryLabel, { color: '#6D2B2B' }]}>벌금</Text>
          <Text style={[styles.summaryValue, { color: '#6D2B2B' }]}>-{todayPenalty.toFixed(1)}</Text>
        </Surface>
      </View>

      {/* 주간 미니 차트 */}
      <Card style={styles.weeklyCard}>
        <Card.Content>
          <View style={styles.weeklyHeader}>
            <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>주간 활동</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#5D7B3A' }]} />
                <Text style={styles.legendText}>벌기</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#C49A6C' }]} />
                <Text style={styles.legendText}>쓰기</Text>
              </View>
            </View>
          </View>
          {weeklyHasData ? (
            <BarChart
              data={{
                labels: weekly.labels,
                datasets: [{ data: weekly.earned.map(v => v || 0.01) }],
              }}
              width={screenWidth - 64}
              height={140}
              yAxisSuffix="h"
              yAxisLabel=""
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(93, 123, 58, ${opacity})`,
                labelColor: () => '#A1887F',
                barPercentage: 0.5,
                propsForBackgroundLines: { strokeDasharray: '4', stroke: '#EFEBE9' },
              }}
              style={{ borderRadius: 8, marginLeft: -16 }}
              fromZero
            />
          ) : (
            <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#A1887F' }}>이번 주 데이터가 없습니다</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* 빠른 기록 버튼 */}
      <View style={styles.quickActions}>
        <Button
          mode="contained"
          icon="plus"
          style={[styles.actionButton, { backgroundColor: '#5D7B3A' }]}
          contentStyle={styles.actionButtonContent}
          labelStyle={styles.actionButtonLabel}
          onPress={() => router.push({ pathname: '/record', params: { type: 'earn' } })}
        >
          시간 벌기
        </Button>
        <Button
          mode="contained"
          icon="minus"
          style={[styles.actionButton, { backgroundColor: '#C49A6C' }]}
          contentStyle={styles.actionButtonContent}
          labelStyle={styles.actionButtonLabel}
          onPress={() => router.push({ pathname: '/record', params: { type: 'spend' } })}
        >
          시간 쓰기
        </Button>
      </View>

      {/* 최근 활동 미리보기 */}
      <Card style={styles.recentCard}>
        <Card.Content>
          <View style={styles.recentHeader}>
            <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>최근 활동</Text>
            <Button compact mode="text" onPress={() => router.push('/history')} labelStyle={{ fontSize: 12, color: '#6B4226' }}>
              더보기
            </Button>
          </View>
          {recentActivities.length === 0 ? (
            <Text style={{ color: '#A1887F', textAlign: 'center', paddingVertical: 16 }}>기록된 활동이 없습니다</Text>
          ) : (
            recentActivities.map((activity) => (
              <View key={activity.id} style={styles.recentItem}>
                <View style={styles.recentItemLeft}>
                  <View style={[styles.recentDot, {
                    backgroundColor: activity.type === 'earn' ? '#5D7B3A'
                      : activity.type === 'spend' ? '#C49A6C'
                      : activity.type === 'penalty' ? '#8B3A3A'
                      : '#6B4226',
                  }]} />
                  <View>
                    <Text style={styles.recentItemCategory}>
                      {getCategoryLabel(activity.category)}
                    </Text>
                    <Text style={styles.recentItemDate}>{activity.date}</Text>
                  </View>
                </View>
                <View style={styles.recentItemRight}>
                  <Text style={[styles.recentItemTime, {
                    color: activity.type === 'earn' ? '#4A6B2E'
                      : activity.type === 'spend' ? '#A67B4B'
                      : '#6D2B2B',
                  }]}>
                    {activity.type === 'earn' ? '+' : '-'}{activity.earnedTime.toFixed(1)}h
                  </Text>
                  {activity.requiresApproval && !activity.approved && (
                    <Text style={styles.recentPending}>대기</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}


// ========== 부모 홈 화면 ==========
function ParentHomeScreen() {
  const user = useStore((state) => state.user);
  const activities = useStore((state) => state.activities);
  const pendingApprovals = useStore((state) => state.pendingApprovals);
  const pendingExchanges = useStore((state) => state.pendingExchanges);
  const loadActivities = useStore((state) => state.loadActivities);
  const loadPendingApprovals = useStore((state) => state.loadPendingApprovals);
  const loadExchanges = useStore((state) => state.loadExchanges);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadActivities(), loadPendingApprovals(), loadExchanges()]);
    setRefreshing(false);
  }, [loadActivities, loadPendingApprovals, loadExchanges]);

  const today = new Date();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayName = dayNames[date.getDay()];
    return `${month}/${day} ${dayName}요일`;
  };

  const children: ChildInfo[] = user?.children || [];
  const totalPending = pendingApprovals.length;
  const totalExchangePending = pendingExchanges.length;

  // 가족 전체 요약 계산
  const familyStats = useMemo(() => {
    let totalBalance = 0;
    let todayEarnedAll = 0;
    let todaySpentAll = 0;
    const todayStr = today.toISOString().split('T')[0];

    children.forEach(child => {
      const stats = computeChildStats(activities, child.id);
      totalBalance += stats.balance;
      todayEarnedAll += stats.todayEarned;
      todaySpentAll += stats.todaySpent;
    });

    return { totalBalance, todayEarnedAll, todaySpentAll };
  }, [activities, children]);

  // 최근 승인/거절 내역
  const recentApproved = useMemo(() =>
    activities
      .filter(a => a.approved && a.approvedBy)
      .slice(0, 3),
    [activities]
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6B4226']} />}
    >
      {/* 날짜 */}
      <View style={styles.dateContainer}>
        <Text variant="titleMedium" style={styles.dateText}>{formatDate(today)}</Text>
      </View>

      {/* 가족 전체 요약 */}
      {children.length > 0 && (
        <Card style={styles.familySummaryCard}>
          <Card.Content>
            <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 12 }}>가족 요약</Text>
            <View style={styles.familyStatsRow}>
              <View style={styles.familyStatItem}>
                <Text style={[styles.familyStatValue, { color: '#6B4226' }]}>{familyStats.totalBalance.toFixed(1)}</Text>
                <Text style={styles.familyStatLabel}>총 잔액</Text>
              </View>
              <View style={styles.familyStatDivider} />
              <View style={styles.familyStatItem}>
                <Text style={[styles.familyStatValue, { color: '#4A6B2E' }]}>+{familyStats.todayEarnedAll.toFixed(1)}</Text>
                <Text style={styles.familyStatLabel}>오늘 벌기</Text>
              </View>
              <View style={styles.familyStatDivider} />
              <View style={styles.familyStatItem}>
                <Text style={[styles.familyStatValue, { color: '#A67B4B' }]}>-{familyStats.todaySpentAll.toFixed(1)}</Text>
                <Text style={styles.familyStatLabel}>오늘 쓰기</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* 알림 카드들 */}
      {(totalPending > 0 || totalExchangePending > 0) && (
        <View style={styles.alertRow}>
          {totalPending > 0 && (
            <Card style={[styles.alertCard, { backgroundColor: '#F5ECD7' }]} onPress={() => router.push('/approve')}>
              <Card.Content style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: '#6B4226' }]}>승인 대기</Text>
                <Text style={[styles.alertCount, { color: '#A67B4B' }]}>{totalPending}건</Text>
              </Card.Content>
            </Card>
          )}
          {totalExchangePending > 0 && (
            <Card style={[styles.alertCard, { backgroundColor: '#EFEBE9' }]} onPress={() => router.push('/(tabs)/exchange')}>
              <Card.Content style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: '#6B4226' }]}>교환 대기</Text>
                <Text style={[styles.alertCount, { color: '#6B4226' }]}>{totalExchangePending}건</Text>
              </Card.Content>
            </Card>
          )}
        </View>
      )}

      {/* 자녀 현황 */}
      <Text variant="titleMedium" style={styles.sectionTitle}>자녀 현황</Text>

      {children.length === 0 ? (
        <Surface style={styles.emptyChildContainer}>
          <Text style={styles.emptyChildText}>등록된 자녀가 없습니다.</Text>
          <Button mode="contained" icon="account-plus" onPress={() => router.push('/(tabs)/add-child')} style={{ marginTop: 12, backgroundColor: '#6B4226' }}>
            자녀 연결하기
          </Button>
        </Surface>
      ) : (
        children.map((child) => {
          const stats = computeChildStats(activities, child.id);
          return (
            <Card key={child.id} style={styles.childCard}>
              <Card.Content>
                <View style={styles.childHeader}>
                  <View style={styles.childInfo}>
                    <Avatar.Text size={44} label={child.name.charAt(0)} style={styles.childAvatar} />
                    <View>
                      <Text variant="titleMedium" style={styles.childName}>{child.name}</Text>
                      <Text style={styles.childEmail}>{child.email}</Text>
                    </View>
                  </View>
                  <View style={styles.childBadges}>
                    {stats.pending > 0 && (
                      <Surface style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>{stats.pending}건 대기</Text>
                      </Surface>
                    )}
                    {stats.streak > 0 && (
                      <Chip compact icon="fire" style={styles.streakChipSmall} textStyle={{ fontSize: 11, color: '#8B5E3C' }}>
                        {stats.streak}일
                      </Chip>
                    )}
                  </View>
                </View>

                {/* 자녀 통계 */}
                <View style={styles.childStatsRow}>
                  <View style={styles.childStatItem}>
                    <Text style={[styles.childStatValue, { color: '#6B4226' }]}>{stats.balance.toFixed(1)}</Text>
                    <Text style={styles.childStatLabel}>잔액</Text>
                  </View>
                  <View style={styles.childStatDivider} />
                  <View style={styles.childStatItem}>
                    <Text style={[styles.childStatValue, { color: '#4A6B2E' }]}>{stats.earned.toFixed(1)}</Text>
                    <Text style={styles.childStatLabel}>총 벌기</Text>
                  </View>
                  <View style={styles.childStatDivider} />
                  <View style={styles.childStatItem}>
                    <Text style={[styles.childStatValue, { color: '#A67B4B' }]}>{stats.spent.toFixed(1)}</Text>
                    <Text style={styles.childStatLabel}>총 쓰기</Text>
                  </View>
                </View>

                {/* 오늘 활동 */}
                <View style={styles.childTodayRow}>
                  <Text style={styles.childTodayLabel}>오늘</Text>
                  <Text style={[styles.childTodayValue, { color: '#4A6B2E' }]}>+{stats.todayEarned.toFixed(1)}h</Text>
                  <Text style={[styles.childTodayValue, { color: '#A67B4B' }]}>-{stats.todaySpent.toFixed(1)}h</Text>
                </View>
              </Card.Content>
            </Card>
          );
        })
      )}

      {/* 빠른 액션 */}
      <View style={styles.parentActions}>
        <Button mode="outlined" icon="account-plus" style={styles.parentActionButton} onPress={() => router.push('/(tabs)/add-child')}>
          자녀 추가
        </Button>
        <Button mode="outlined" icon="cash" style={styles.parentActionButton} onPress={() => router.push('/(tabs)/exchange')}>
          저금 교환
        </Button>
      </View>

      {/* 최근 승인 내역 */}
      {recentApproved.length > 0 && (
        <Card style={styles.recentCard}>
          <Card.Content>
            <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 8 }}>최근 승인</Text>
            {recentApproved.map((activity) => (
              <View key={activity.id} style={styles.recentItem}>
                <View style={styles.recentItemLeft}>
                  <View style={[styles.recentDot, { backgroundColor: '#5D7B3A' }]} />
                  <View>
                    <Text style={styles.recentItemCategory}>
                      {activity.userName} - {getCategoryLabel(activity.category)}
                    </Text>
                    <Text style={styles.recentItemDate}>{activity.date}</Text>
                  </View>
                </View>
                <Text style={[styles.recentItemTime, { color: '#4A6B2E' }]}>+{activity.earnedTime.toFixed(1)}h</Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

export default function HomeScreen() {
  const user = useStore((state) => state.user);
  const isParent = user?.role === 'parent';
  return isParent ? <ParentHomeScreen /> : <ChildHomeScreen />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  dateContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  dateText: { color: '#8D6E63' },
  holidayBadge: { color: '#6B4226', fontWeight: 'bold' },
  streakChip: { backgroundColor: '#F5ECD7' },
  streakText: { color: '#8B5E3C', fontWeight: 'bold', fontSize: 12 },
  balanceCard: { margin: 16, marginTop: 8, backgroundColor: '#6B4226', borderRadius: 16 },
  balanceContent: { alignItems: 'center', paddingVertical: 20 },
  balanceLabel: { color: '#D7CCC8' },
  balanceValue: { color: '#FFFFFF', fontWeight: 'bold', marginTop: 4 },
  balanceUnit: { fontSize: 20, fontWeight: 'normal' },
  progressContainer: { width: '100%', marginTop: 16, paddingHorizontal: 16 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressText: { color: '#D7CCC8', fontSize: 12, marginTop: 6, textAlign: 'center' },
  statusRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pendingChipChild: { backgroundColor: '#F5ECD7' },
  exchangePendingChip: { backgroundColor: '#EFEBE9' },
  summaryContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', elevation: 1 },
  summaryLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
  weeklyCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 12 },
  weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  legendRow: { flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#A1887F', fontSize: 11 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  actionButton: { flex: 1, borderRadius: 12 },
  actionButtonContent: { paddingVertical: 8 },
  actionButtonLabel: { fontSize: 16, fontWeight: 'bold' },
  recentCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 12 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  recentItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EFEBE9',
  },
  recentItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recentDot: { width: 8, height: 8, borderRadius: 4 },
  recentItemCategory: { color: '#4E342E', fontWeight: '500', fontSize: 13 },
  recentItemDate: { color: '#A1887F', fontSize: 11, marginTop: 1 },
  recentItemRight: { alignItems: 'flex-end' },
  recentItemTime: { fontWeight: '600', fontSize: 14 },
  recentPending: { color: '#A67B4B', fontSize: 10, marginTop: 2 },

  // 부모 전용 스타일
  familySummaryCard: { marginHorizontal: 16, marginTop: 8, borderRadius: 12, backgroundColor: '#FFFDF7' },
  familyStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  familyStatItem: { alignItems: 'center', flex: 1 },
  familyStatValue: { fontSize: 20, fontWeight: 'bold' },
  familyStatLabel: { color: '#A1887F', fontSize: 12, marginTop: 4 },
  familyStatDivider: { width: 1, backgroundColor: '#D7CCC8' },
  alertRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 12 },
  alertCard: { flex: 1, borderRadius: 12 },
  alertContent: { alignItems: 'center', paddingVertical: 4 },
  alertTitle: { fontSize: 13, fontWeight: '500' },
  alertCount: { fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  sectionTitle: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    fontWeight: 'bold', color: '#3E2723',
  },
  childCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12 },
  childHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  childInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  childAvatar: { backgroundColor: '#6B4226' },
  childName: { fontWeight: 'bold', color: '#3E2723' },
  childEmail: { color: '#8D6E63', marginTop: 2, fontSize: 12 },
  childBadges: { flexDirection: 'row', gap: 6 },
  pendingBadge: { backgroundColor: '#F0D6D6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pendingBadgeText: { color: '#6D2B2B', fontSize: 12, fontWeight: '500' },
  streakChipSmall: { backgroundColor: '#F5ECD7', height: 26 },
  childStatsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EFEBE9' },
  childStatItem: { alignItems: 'center', flex: 1 },
  childStatValue: { fontSize: 18, fontWeight: 'bold' },
  childStatLabel: { color: '#A1887F', fontSize: 11, marginTop: 2 },
  childStatDivider: { width: 1, backgroundColor: '#EFEBE9' },
  childTodayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EFEBE9' },
  childTodayLabel: { color: '#A1887F', fontSize: 12 },
  childTodayValue: { fontWeight: '600', fontSize: 13 },
  parentActions: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  parentActionButton: { flex: 1, borderColor: '#D7CCC8' },
  emptyChildContainer: { marginHorizontal: 16, marginBottom: 16, padding: 24, borderRadius: 12, alignItems: 'center' },
  emptyChildText: { color: '#8D6E63', fontSize: 16, marginBottom: 4 },
});
