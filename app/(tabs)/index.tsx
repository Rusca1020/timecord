import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Card, Text, Button, Surface } from 'react-native-paper';
import { router } from 'expo-router';
import { useStore, useTodayEarned, useTodaySpent, useTodayPenalty } from '@/store/useStore';

export default function HomeScreen() {
  const user = useStore((state) => state.user);
  const todayEarned = useTodayEarned();
  const todaySpent = useTodaySpent();
  const todayPenalty = useTodayPenalty();

  // 데모용 잔액 (실제로는 user?.balance 사용)
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
});
