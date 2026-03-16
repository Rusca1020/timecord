import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Card, Chip, Surface, IconButton } from 'react-native-paper';
import { StackedBarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { useStore } from '@/store/useStore';
import { Activity, Exchange, ChildInfo } from '@/types';

type PeriodType = 'daily' | 'weekly' | 'monthly';

const screenWidth = Dimensions.get('window').width;

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
  game: '컴퓨터 게임',
  youtube: '유튜브',
  no_record: '기록 안함',
  unauthorized_use: '잔액 없이 사용',
  false_record: '거짓 기록',
};

const categoryColors: Record<string, string> = {
  holiday_base: '#5D7B3A',
  academy_study: '#8D6E63',
  academy_homework: '#6B4226',
  self_study: '#9C7B5C',
  reading: '#B08968',
  good_deed: '#C49A6C',
  coding: '#7B9971',
  app_complete: '#6B8F5B',
  app_store: '#8B7355',
  game: '#C49A6C',
  youtube: '#8B3A3A',
  no_record: '#6D2B2B',
  unauthorized_use: '#5A2020',
  false_record: '#4A1818',
};

// 주간 데이터 계산
function getWeeklyData(activities: Activity[]) {
  const today = new Date();
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  const labels: string[] = [];
  const earned: number[] = [];
  const spent: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    labels.push(dayLabels[date.getDay()]);

    const dayActivities = activities.filter(a => a.date === dateStr);
    earned.push(
      dayActivities
        .filter(a => a.type === 'earn' && a.approved)
        .reduce((sum, a) => sum + a.earnedTime, 0)
    );
    spent.push(
      dayActivities
        .filter(a => a.type === 'spend')
        .reduce((sum, a) => sum + a.duration, 0)
    );
  }

  return { labels, earned, spent };
}

// 월간 요약 계산
function getMonthlyData(activities: Activity[]) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthActivities = activities.filter(a => {
    const d = new Date(a.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const earned = monthActivities.filter(a => a.type === 'earn' && a.approved).reduce((s, a) => s + a.earnedTime, 0);
  const spent = monthActivities.filter(a => a.type === 'spend').reduce((s, a) => s + a.duration, 0);
  const penalty = monthActivities.filter(a => a.type === 'penalty').reduce((s, a) => s + a.earnedTime, 0);
  const exchanged = monthActivities.filter(a => a.type === 'exchange').reduce((s, a) => s + a.duration, 0);

  return { earned, spent, penalty, exchanged, net: earned - spent - penalty - exchanged };
}

// 카테고리별 분석
function getCategoryBreakdown(activities: Activity[], type: 'earn' | 'spend') {
  const filtered = activities.filter(a => a.type === type && (type === 'earn' ? a.approved : true));
  const byCategory: Record<string, number> = {};
  filtered.forEach(a => {
    const key = a.category;
    byCategory[key] = (byCategory[key] || 0) + (type === 'earn' ? a.earnedTime : a.duration);
  });

  return Object.entries(byCategory)
    .map(([category, total]) => ({
      category,
      label: categoryNames[category] || category,
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

// 월간 일별 추세 데이터
function getMonthlyTrendData(activities: Activity[]) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const dayCount = today.getDate();

  const labels: string[] = [];
  const earned: number[] = [];
  const spent: number[] = [];

  for (let d = 1; d <= dayCount; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    labels.push(d % 5 === 1 || d === dayCount ? String(d) : '');
    const dayActs = activities.filter(a => a.date === dateStr);
    earned.push(dayActs.filter(a => a.type === 'earn' && a.approved).reduce((s, a) => s + a.earnedTime, 0));
    spent.push(dayActs.filter(a => a.type === 'spend').reduce((s, a) => s + a.duration, 0));
  }

  return { labels, earned, spent };
}

// 카테고리 파이차트 데이터 변환
function getCategoryPieData(activities: Activity[], type: 'earn' | 'spend') {
  const breakdown = getCategoryBreakdown(activities, type);
  return breakdown.map((item) => ({
    name: item.label,
    total: Math.round(item.total * 10) / 10,
    color: categoryColors[item.category] || '#A1887F',
    legendFontColor: '#8D6E63',
    legendFontSize: 11,
  }));
}

// 교환 통계 계산
function getExchangeStats(exchanges: Exchange[]) {
  const completed = exchanges.filter(e => e.status === 'approved' || e.status === 'completed');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const thisMonth = completed.filter(e => {
    const d = new Date(e.requestedAt);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  return {
    totalHours: completed.reduce((s, e) => s + e.hours, 0),
    totalAmount: completed.reduce((s, e) => s + e.amount, 0),
    thisMonthHours: thisMonth.reduce((s, e) => s + e.hours, 0),
    thisMonthAmount: thisMonth.reduce((s, e) => s + e.amount, 0),
    count: completed.length,
    averageSize: completed.length > 0
      ? completed.reduce((s, e) => s + e.hours, 0) / completed.length
      : 0,
  };
}

// 벌금 분석
function getPenaltyAnalytics(activities: Activity[]) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const penalties = activities.filter(a => {
    if (a.type !== 'penalty') return false;
    const d = new Date(a.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const byCategory: Record<string, { count: number; total: number }> = {};
  penalties.forEach(p => {
    if (!byCategory[p.category]) byCategory[p.category] = { count: 0, total: 0 };
    byCategory[p.category].count += 1;
    byCategory[p.category].total += p.earnedTime;
  });

  return {
    monthCount: penalties.length,
    monthTotal: penalties.reduce((s, p) => s + p.earnedTime, 0),
    byCategory: Object.entries(byCategory).map(([cat, data]) => ({
      category: cat,
      label: categoryNames[cat] || cat,
      ...data,
    })).sort((a, b) => b.total - a.total),
  };
}

// 날짜 포맷 헬퍼
function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]})`;
}

function formatWeekRange(baseDate: Date): string {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - 6);
  return `${start.getMonth() + 1}/${start.getDate()} ~ ${baseDate.getMonth() + 1}/${baseDate.getDate()}`;
}

function formatMonthDisplay(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

// 일별 상세 데이터
function getDailyData(activities: Activity[], dateStr: string) {
  const dayActivities = activities.filter(a => a.date === dateStr);
  const earned = dayActivities.filter(a => a.type === 'earn' && a.approved).reduce((s, a) => s + a.earnedTime, 0);
  const spent = dayActivities.filter(a => a.type === 'spend').reduce((s, a) => s + a.duration, 0);
  const penalty = dayActivities.filter(a => a.type === 'penalty').reduce((s, a) => s + a.earnedTime, 0);
  const net = earned - spent - penalty;

  const earnByCategory: Record<string, number> = {};
  const spendByCategory: Record<string, number> = {};
  dayActivities.filter(a => a.type === 'earn' && a.approved).forEach(a => {
    earnByCategory[a.category] = (earnByCategory[a.category] || 0) + a.earnedTime;
  });
  dayActivities.filter(a => a.type === 'spend').forEach(a => {
    spendByCategory[a.category] = (spendByCategory[a.category] || 0) + a.duration;
  });

  return {
    activities: dayActivities.sort((a, b) => {
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }),
    earned,
    spent,
    penalty,
    net,
    earnByCategory: Object.entries(earnByCategory).map(([cat, total]) => ({
      category: cat, label: categoryNames[cat] || cat, total,
    })).sort((a, b) => b.total - a.total),
    spendByCategory: Object.entries(spendByCategory).map(([cat, total]) => ({
      category: cat, label: categoryNames[cat] || cat, total,
    })).sort((a, b) => b.total - a.total),
    totalActivities: dayActivities.length,
  };
}

// 특정 주간 데이터 (날짜 기준 해당 주)
function getWeeklyDataForDate(activities: Activity[], baseDate: Date) {
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  const labels: string[] = [];
  const earned: number[] = [];
  const spent: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    const dateStr = formatDateStr(date);
    labels.push(dayLabels[date.getDay()]);

    const dayActivities = activities.filter(a => a.date === dateStr);
    earned.push(
      dayActivities.filter(a => a.type === 'earn' && a.approved).reduce((sum, a) => sum + a.earnedTime, 0)
    );
    spent.push(
      dayActivities.filter(a => a.type === 'spend').reduce((sum, a) => sum + a.duration, 0)
    );
  }

  const totalEarned = earned.reduce((s, v) => s + v, 0);
  const totalSpent = spent.reduce((s, v) => s + v, 0);
  const penalty = (() => {
    const start = new Date(baseDate);
    start.setDate(start.getDate() - 6);
    return activities.filter(a => {
      if (a.type !== 'penalty') return false;
      return a.date >= formatDateStr(start) && a.date <= formatDateStr(baseDate);
    }).reduce((s, a) => s + a.earnedTime, 0);
  })();

  return { labels, earned, spent, totalEarned, totalSpent, penalty };
}

// 특정 월 데이터
function getMonthlyDataForDate(activities: Activity[], year: number, month: number) {
  const monthActivities = activities.filter(a => {
    const d = new Date(a.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const earned = monthActivities.filter(a => a.type === 'earn' && a.approved).reduce((s, a) => s + a.earnedTime, 0);
  const spent = monthActivities.filter(a => a.type === 'spend').reduce((s, a) => s + a.duration, 0);
  const penalty = monthActivities.filter(a => a.type === 'penalty').reduce((s, a) => s + a.earnedTime, 0);
  const exchanged = monthActivities.filter(a => a.type === 'exchange').reduce((s, a) => s + a.duration, 0);

  // 일별 추세
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const daysInMonth = isCurrentMonth ? today.getDate() : new Date(year, month + 1, 0).getDate();

  const dailyLabels: string[] = [];
  const dailyEarned: number[] = [];
  const dailySpent: number[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dailyLabels.push(d % 5 === 1 || d === daysInMonth ? String(d) : '');
    const dayActs = monthActivities.filter(a => a.date === dateStr);
    dailyEarned.push(dayActs.filter(a => a.type === 'earn' && a.approved).reduce((s, a) => s + a.earnedTime, 0));
    dailySpent.push(dayActs.filter(a => a.type === 'spend').reduce((s, a) => s + a.duration, 0));
  }

  return {
    earned, spent, penalty, exchanged,
    net: earned - spent - penalty - exchanged,
    dailyLabels, dailyEarned, dailySpent,
    totalActivities: monthActivities.length,
  };
}

// 추가 인사이트
function getAdditionalInsights(activities: Activity[]) {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  activities.filter(a => a.type === 'earn' && a.approved).forEach(a => {
    const d = new Date(a.date);
    dayTotals[d.getDay()] += a.earnedTime;
  });
  const maxDay = dayTotals.indexOf(Math.max(...dayTotals));
  const maxDayValue = dayTotals[maxDay];

  const requiresApproval = activities.filter(a => a.requiresApproval);
  const approved = requiresApproval.filter(a => a.approved);
  const approvalRate = requiresApproval.length > 0
    ? (approved.length / requiresApproval.length) * 100
    : 0;

  const total = activities.filter(a => a.type !== 'exchange' && a.type !== 'neutral').length;
  const earnCount = activities.filter(a => a.type === 'earn').length;
  const spendCount = activities.filter(a => a.type === 'spend').length;
  const penaltyCount = activities.filter(a => a.type === 'penalty').length;

  return {
    mostProductiveDay: dayNames[maxDay],
    mostProductiveDayValue: maxDayValue,
    approvalRate,
    approvalTotal: requiresApproval.length,
    approvedCount: approved.length,
    distribution: {
      earn: total > 0 ? (earnCount / total) * 100 : 0,
      spend: total > 0 ? (spendCount / total) * 100 : 0,
      penalty: total > 0 ? (penaltyCount / total) * 100 : 0,
    },
  };
}

// 활동 타입 아이콘/색상
function getActivityTypeStyle(type: string) {
  switch (type) {
    case 'earn': return { color: '#4A6B2E', label: '벌기', icon: 'plus' as const };
    case 'spend': return { color: '#A67B4B', label: '쓰기', icon: 'minus' as const };
    case 'penalty': return { color: '#6D2B2B', label: '벌금', icon: 'alert' as const };
    case 'exchange': return { color: '#6B4226', label: '교환', icon: 'swap-horizontal' as const };
    default: return { color: '#A1887F', label: '중립', icon: 'circle-outline' as const };
  }
}

// ============================================
// 일별 통계 뷰
// ============================================
function DailyStatsView({ activities, selectedDate, onDateChange }: {
  activities: Activity[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}) {
  const dateStr = formatDateStr(selectedDate);
  const daily = useMemo(() => getDailyData(activities, dateStr), [activities, dateStr]);

  const goToPrev = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d);
  };
  const goToNext = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) onDateChange(d);
  };
  const isToday = dateStr === formatDateStr(new Date());

  return (
    <>
      {/* 날짜 네비게이션 */}
      <View style={styles.dateNav}>
        <IconButton icon="chevron-left" size={24} onPress={goToPrev} />
        <TouchableOpacity onPress={() => onDateChange(new Date())}>
          <Text style={styles.dateNavText}>
            {isToday ? '오늘' : formatDisplayDate(selectedDate)}
          </Text>
        </TouchableOpacity>
        <IconButton icon="chevron-right" size={24} onPress={goToNext} disabled={isToday} />
      </View>

      {/* 일별 요약 */}
      <Card style={styles.monthCard}>
        <Card.Content>
          <View style={styles.monthGrid}>
            <View style={styles.monthItem}>
              <Text style={[styles.monthValue, { color: '#4A6B2E' }]}>{daily.earned.toFixed(1)}</Text>
              <Text style={styles.monthLabel}>벌기</Text>
            </View>
            <View style={styles.monthItem}>
              <Text style={[styles.monthValue, { color: '#A67B4B' }]}>{daily.spent.toFixed(1)}</Text>
              <Text style={styles.monthLabel}>쓰기</Text>
            </View>
            <View style={styles.monthItem}>
              <Text style={[styles.monthValue, { color: '#6D2B2B' }]}>{daily.penalty.toFixed(1)}</Text>
              <Text style={styles.monthLabel}>벌금</Text>
            </View>
            <View style={styles.monthItem}>
              <Text style={[styles.monthValue, { color: '#6B4226', fontWeight: 'bold' }]}>{daily.net.toFixed(1)}</Text>
              <Text style={styles.monthLabel}>순수익</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 카테고리별 요약 */}
      {(daily.earnByCategory.length > 0 || daily.spendByCategory.length > 0) && (
        <Card style={styles.categoryCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>카테고리별</Text>
            {daily.earnByCategory.map((item) => (
              <View key={item.category} style={styles.categoryRow}>
                <View style={styles.categoryLabelRow}>
                  <View style={[styles.categoryDot, { backgroundColor: categoryColors[item.category] || '#4A6B2E' }]} />
                  <Text style={styles.categoryLabel}>{item.label}</Text>
                </View>
                <Text style={[styles.categoryValue, { color: '#4A6B2E' }]}>+{item.total.toFixed(1)}시간</Text>
              </View>
            ))}
            {daily.spendByCategory.map((item) => (
              <View key={item.category} style={styles.categoryRow}>
                <View style={styles.categoryLabelRow}>
                  <View style={[styles.categoryDot, { backgroundColor: categoryColors[item.category] || '#A67B4B' }]} />
                  <Text style={styles.categoryLabel}>{item.label}</Text>
                </View>
                <Text style={[styles.categoryValue, { color: '#A67B4B' }]}>-{item.total.toFixed(1)}시간</Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* 활동 목록 */}
      <Card style={styles.categoryCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            활동 목록 ({daily.totalActivities}건)
          </Text>
          {daily.activities.length === 0 ? (
            <View style={styles.noDataContainerSmall}>
              <Text style={styles.noDataText}>이 날 활동이 없습니다</Text>
            </View>
          ) : (
            daily.activities.map((act) => {
              const typeStyle = getActivityTypeStyle(act.type);
              return (
                <View key={act.id} style={styles.activityRow}>
                  <View style={[styles.activityTypeBadge, { backgroundColor: typeStyle.color + '1A' }]}>
                    <Text style={[styles.activityTypeBadgeText, { color: typeStyle.color }]}>{typeStyle.label}</Text>
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityCategory}>{categoryNames[act.category] || act.category}</Text>
                    {act.startTime && <Text style={styles.activityTime}>{act.startTime}~{act.endTime}</Text>}
                  </View>
                  <Text style={[styles.activityHours, { color: typeStyle.color }]}>
                    {act.type === 'earn' ? '+' : '-'}{act.type === 'earn' ? act.earnedTime.toFixed(1) : act.duration.toFixed(1)}h
                  </Text>
                  {act.type === 'earn' && (
                    <View style={[styles.approvalDot, { backgroundColor: act.approved ? '#4A6B2E' : '#C49A6C' }]} />
                  )}
                </View>
              );
            })
          )}
        </Card.Content>
      </Card>
    </>
  );
}

// ============================================
// 주별 통계 뷰
// ============================================
function WeeklyStatsView({ activities, selectedDate, onDateChange }: {
  activities: Activity[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}) {
  const weekly = useMemo(() => getWeeklyDataForDate(activities, selectedDate), [activities, selectedDate]);
  const earnBreakdown = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - 6);
    const startStr = formatDateStr(start);
    const endStr = formatDateStr(selectedDate);
    const weekActs = activities.filter(a => a.date >= startStr && a.date <= endStr);
    return getCategoryBreakdown(weekActs, 'earn');
  }, [activities, selectedDate]);
  const spendBreakdown = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - 6);
    const startStr = formatDateStr(start);
    const endStr = formatDateStr(selectedDate);
    const weekActs = activities.filter(a => a.date >= startStr && a.date <= endStr);
    return getCategoryBreakdown(weekActs, 'spend');
  }, [activities, selectedDate]);

  const hasData = weekly.earned.some(v => v > 0) || weekly.spent.some(v => v > 0);

  const stackedData = {
    labels: weekly.labels,
    legend: ['벌기', '쓰기'],
    data: weekly.labels.map((_, i) => [
      weekly.earned[i] || 0.01,
      weekly.spent[i] || 0.01,
    ]),
    barColors: ['#5D7B3A', '#C49A6C'],
  };

  const goToPrev = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    onDateChange(d);
  };
  const goToNext = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    if (d <= new Date()) onDateChange(d);
  };
  const isCurrentWeek = formatDateStr(selectedDate) === formatDateStr(new Date()) ||
    (new Date().getTime() - selectedDate.getTime()) < 7 * 86400000 && selectedDate <= new Date();

  return (
    <>
      {/* 주간 네비게이션 */}
      <View style={styles.dateNav}>
        <IconButton icon="chevron-left" size={24} onPress={goToPrev} />
        <TouchableOpacity onPress={() => onDateChange(new Date())}>
          <Text style={styles.dateNavText}>{formatWeekRange(selectedDate)}</Text>
        </TouchableOpacity>
        <IconButton icon="chevron-right" size={24} onPress={goToNext} disabled={isCurrentWeek} />
      </View>

      {/* 주간 요약 */}
      <Card style={styles.monthCard}>
        <Card.Content>
          <View style={styles.monthGrid}>
            <View style={styles.monthItem}>
              <Text style={[styles.monthValue, { color: '#4A6B2E' }]}>{weekly.totalEarned.toFixed(1)}</Text>
              <Text style={styles.monthLabel}>벌기</Text>
            </View>
            <View style={styles.monthItem}>
              <Text style={[styles.monthValue, { color: '#A67B4B' }]}>{weekly.totalSpent.toFixed(1)}</Text>
              <Text style={styles.monthLabel}>쓰기</Text>
            </View>
            <View style={styles.monthItem}>
              <Text style={[styles.monthValue, { color: '#6D2B2B' }]}>{weekly.penalty.toFixed(1)}</Text>
              <Text style={styles.monthLabel}>벌금</Text>
            </View>
            <View style={styles.monthItem}>
              <Text style={[styles.monthValue, { color: '#6B4226', fontWeight: 'bold' }]}>
                {(weekly.totalEarned - weekly.totalSpent - weekly.penalty).toFixed(1)}
              </Text>
              <Text style={styles.monthLabel}>순수익</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 주간 스택 바차트 */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>일별 활동</Text>
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
          {hasData ? (
            <>
              <StackedBarChart
                data={stackedData}
                width={screenWidth - 64}
                height={200}
                chartConfig={{
                  backgroundColor: '#FFFDF7',
                  backgroundGradientFrom: '#FFFDF7',
                  backgroundGradientTo: '#FFFDF7',
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(141, 110, 99, ${opacity})`,
                  labelColor: () => '#8D6E63',
                  barPercentage: 0.6,
                  propsForBackgroundLines: {
                    strokeDasharray: '4',
                    stroke: '#D7CCC8',
                  },
                }}
                style={{ borderRadius: 8 }}
                hideLegend={true}
              />
              <View style={styles.weeklyTextSummary}>
                {weekly.labels.map((label, i) => (
                  <View key={i} style={styles.dayColumn}>
                    <Text style={styles.dayLabel}>{label}</Text>
                    <Text style={[styles.dayValue, { color: '#5D7B3A' }]}>{weekly.earned[i].toFixed(1)}</Text>
                    <Text style={[styles.dayValue, { color: '#C49A6C' }]}>{weekly.spent[i].toFixed(1)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>이 주 데이터가 없습니다</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* 주간 카테고리 */}
      {earnBreakdown.length > 0 && (
        <Card style={styles.categoryCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>벌기 카테고리</Text>
            {earnBreakdown.map((item) => {
              const total = earnBreakdown.reduce((s, b) => s + b.total, 0);
              const pct = total > 0 ? ((item.total / total) * 100).toFixed(1) : '0';
              return (
                <View key={item.category} style={styles.categoryRow}>
                  <View style={styles.categoryLabelRow}>
                    <View style={[styles.categoryDot, { backgroundColor: categoryColors[item.category] || '#A1887F' }]} />
                    <Text style={styles.categoryLabel}>{item.label}</Text>
                  </View>
                  <Text style={[styles.categoryValue, { color: '#4A6B2E' }]}>
                    {item.total.toFixed(1)}시간 ({pct}%)
                  </Text>
                </View>
              );
            })}
          </Card.Content>
        </Card>
      )}
      {spendBreakdown.length > 0 && (
        <Card style={styles.categoryCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>쓰기 카테고리</Text>
            {spendBreakdown.map((item) => {
              const total = spendBreakdown.reduce((s, b) => s + b.total, 0);
              const pct = total > 0 ? ((item.total / total) * 100).toFixed(1) : '0';
              return (
                <View key={item.category} style={styles.categoryRow}>
                  <View style={styles.categoryLabelRow}>
                    <View style={[styles.categoryDot, { backgroundColor: categoryColors[item.category] || '#A1887F' }]} />
                    <Text style={styles.categoryLabel}>{item.label}</Text>
                  </View>
                  <Text style={[styles.categoryValue, { color: '#A67B4B' }]}>
                    {item.total.toFixed(1)}시간 ({pct}%)
                  </Text>
                </View>
              );
            })}
          </Card.Content>
        </Card>
      )}
    </>
  );
}

// ============================================
// 월별 통계 뷰
// ============================================
function MonthlyStatsView({ activities, exchanges, selectedDate, onDateChange }: {
  activities: Activity[];
  exchanges: Exchange[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const monthly = useMemo(() => getMonthlyDataForDate(activities, year, month), [activities, year, month]);
  const earnPieData = useMemo(() => {
    const monthActs = activities.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return getCategoryPieData(monthActs, 'earn');
  }, [activities, year, month]);
  const spendPieData = useMemo(() => {
    const monthActs = activities.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return getCategoryPieData(monthActs, 'spend');
  }, [activities, year, month]);
  const earnBreakdown = useMemo(() => {
    const monthActs = activities.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return getCategoryBreakdown(monthActs, 'earn');
  }, [activities, year, month]);
  const spendBreakdown = useMemo(() => {
    const monthActs = activities.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return getCategoryBreakdown(monthActs, 'spend');
  }, [activities, year, month]);
  const exchangeStats = useMemo(() => {
    const monthExchanges = exchanges.filter(e => {
      const d = new Date(e.requestedAt);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return getExchangeStats(monthExchanges);
  }, [exchanges, year, month]);
  const penaltyStats = useMemo(() => {
    const monthActs = activities.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return getPenaltyAnalytics(monthActs);
  }, [activities, year, month]);

  const goToPrev = () => {
    const d = new Date(year, month - 1, 1);
    onDateChange(d);
  };
  const goToNext = () => {
    const d = new Date(year, month + 1, 1);
    const now = new Date();
    if (d.getFullYear() < now.getFullYear() || (d.getFullYear() === now.getFullYear() && d.getMonth() <= now.getMonth())) {
      onDateChange(d);
    }
  };
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();

  return (
    <>
      {/* 월 네비게이션 */}
      <View style={styles.dateNav}>
        <IconButton icon="chevron-left" size={24} onPress={goToPrev} />
        <TouchableOpacity onPress={() => onDateChange(new Date())}>
          <Text style={styles.dateNavText}>{formatMonthDisplay(selectedDate)}</Text>
        </TouchableOpacity>
        <IconButton icon="chevron-right" size={24} onPress={goToNext} disabled={isCurrentMonth} />
      </View>

      {/* 월간 요약 */}
      <Card style={styles.monthCard}>
        <Card.Content>
          <View style={styles.monthGrid}>
            <View style={styles.monthItem}>
              <Text style={[styles.monthValue, { color: '#4A6B2E' }]}>{monthly.earned.toFixed(1)}</Text>
              <Text style={styles.monthLabel}>벌기</Text>
            </View>
            <View style={styles.monthItem}>
              <Text style={[styles.monthValue, { color: '#A67B4B' }]}>{monthly.spent.toFixed(1)}</Text>
              <Text style={styles.monthLabel}>쓰기</Text>
            </View>
            <View style={styles.monthItem}>
              <Text style={[styles.monthValue, { color: '#6D2B2B' }]}>{monthly.penalty.toFixed(1)}</Text>
              <Text style={styles.monthLabel}>벌금</Text>
            </View>
            <View style={styles.monthItem}>
              <Text style={[styles.monthValue, { color: '#6B4226', fontWeight: 'bold' }]}>{monthly.net.toFixed(1)}</Text>
              <Text style={styles.monthLabel}>순수익</Text>
            </View>
          </View>
          <View style={styles.monthExtraRow}>
            <Text style={styles.monthExtraText}>총 활동: {monthly.totalActivities}건</Text>
            {monthly.exchanged > 0 && (
              <Text style={styles.monthExtraText}>교환: {monthly.exchanged.toFixed(1)}시간</Text>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* 월간 추세 라인차트 */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>일별 추세</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4A6B2E' }]} />
              <Text style={styles.legendText}>벌기</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#A67B4B' }]} />
              <Text style={styles.legendText}>쓰기</Text>
            </View>
          </View>
          {monthly.dailyEarned.some(v => v > 0) || monthly.dailySpent.some(v => v > 0) ? (
            <LineChart
              data={{
                labels: monthly.dailyLabels,
                datasets: [
                  {
                    data: monthly.dailyEarned.map(v => v || 0),
                    color: (opacity = 1) => `rgba(74, 107, 46, ${opacity})`,
                    strokeWidth: 2,
                  },
                  {
                    data: monthly.dailySpent.map(v => v || 0),
                    color: (opacity = 1) => `rgba(166, 123, 75, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={screenWidth - 64}
              height={200}
              yAxisSuffix="h"
              yAxisLabel=""
              chartConfig={{
                backgroundColor: '#FFFDF7',
                backgroundGradientFrom: '#FFFDF7',
                backgroundGradientTo: '#FFFDF7',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(141, 110, 99, ${opacity})`,
                labelColor: () => '#8D6E63',
                propsForBackgroundLines: {
                  strokeDasharray: '4',
                  stroke: '#D7CCC8',
                },
                propsForDots: { r: '2' },
              }}
              bezier
              style={{ borderRadius: 8 }}
              fromZero
              withDots={false}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>이 달 데이터가 없습니다</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* 벌기 카테고리 파이차트 */}
      {earnPieData.length > 0 && (
        <Card style={styles.categoryCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>벌기 카테고리</Text>
            <PieChart
              data={earnPieData}
              width={screenWidth - 64}
              height={180}
              accessor="total"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute={false}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
            />
            {earnBreakdown.map((item) => {
              const total = earnBreakdown.reduce((s, b) => s + b.total, 0);
              const pct = total > 0 ? ((item.total / total) * 100).toFixed(1) : '0';
              return (
                <View key={item.category} style={styles.categoryRow}>
                  <View style={styles.categoryLabelRow}>
                    <View style={[styles.categoryDot, { backgroundColor: categoryColors[item.category] || '#A1887F' }]} />
                    <Text style={styles.categoryLabel}>{item.label}</Text>
                  </View>
                  <Text style={[styles.categoryValue, { color: '#4A6B2E' }]}>
                    {item.total.toFixed(1)}시간 ({pct}%)
                  </Text>
                </View>
              );
            })}
          </Card.Content>
        </Card>
      )}

      {/* 쓰기 카테고리 파이차트 */}
      {spendPieData.length > 0 && (
        <Card style={styles.categoryCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>쓰기 카테고리</Text>
            <PieChart
              data={spendPieData}
              width={screenWidth - 64}
              height={180}
              accessor="total"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute={false}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
            />
            {spendBreakdown.map((item) => {
              const total = spendBreakdown.reduce((s, b) => s + b.total, 0);
              const pct = total > 0 ? ((item.total / total) * 100).toFixed(1) : '0';
              return (
                <View key={item.category} style={styles.categoryRow}>
                  <View style={styles.categoryLabelRow}>
                    <View style={[styles.categoryDot, { backgroundColor: categoryColors[item.category] || '#A1887F' }]} />
                    <Text style={styles.categoryLabel}>{item.label}</Text>
                  </View>
                  <Text style={[styles.categoryValue, { color: '#A67B4B' }]}>
                    {item.total.toFixed(1)}시간 ({pct}%)
                  </Text>
                </View>
              );
            })}
          </Card.Content>
        </Card>
      )}

      {/* 교환 통계 */}
      {exchangeStats.count > 0 && (
        <Card style={styles.monthCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>교환 통계</Text>
            <View style={styles.monthGrid}>
              <View style={styles.monthItem}>
                <Text style={[styles.monthValue, { color: '#6B4226' }]}>{exchangeStats.totalHours}</Text>
                <Text style={styles.monthLabel}>교환시간</Text>
              </View>
              <View style={styles.monthItem}>
                <Text style={[styles.monthValue, { color: '#4A6B2E' }]}>
                  {exchangeStats.totalAmount.toLocaleString()}
                </Text>
                <Text style={styles.monthLabel}>금액(원)</Text>
              </View>
              <View style={styles.monthItem}>
                <Text style={[styles.monthValue, { color: '#6B4226' }]}>{exchangeStats.count}</Text>
                <Text style={styles.monthLabel}>횟수</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* 벌금 분석 */}
      {penaltyStats.monthCount > 0 && (
        <Card style={styles.categoryCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>벌금 분석</Text>
            <View style={styles.penaltySummaryRow}>
              <View style={styles.monthItem}>
                <Text style={[styles.monthValue, { color: '#6D2B2B' }]}>{penaltyStats.monthCount}</Text>
                <Text style={styles.monthLabel}>벌금 횟수</Text>
              </View>
              <View style={styles.monthItem}>
                <Text style={[styles.monthValue, { color: '#6D2B2B' }]}>
                  {penaltyStats.monthTotal.toFixed(1)}
                </Text>
                <Text style={styles.monthLabel}>총 벌금(시간)</Text>
              </View>
            </View>
            {penaltyStats.byCategory.map((item) => (
              <View key={item.category} style={styles.categoryRow}>
                <Text style={styles.categoryLabel}>{item.label} ({item.count}회)</Text>
                <Text style={[styles.categoryValue, { color: '#6D2B2B' }]}>
                  -{item.total.toFixed(1)}시간
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}
    </>
  );
}

// ============================================
// 자녀 통계 뷰 (기간 선택 포함)
// ============================================
function ChildStatsView({ activities, exchanges }: { activities: Activity[]; exchanges: Exchange[] }) {
  const [period, setPeriod] = useState<PeriodType>('daily');
  const [dailyDate, setDailyDate] = useState(new Date());
  const [weeklyDate, setWeeklyDate] = useState(new Date());
  const [monthlyDate, setMonthlyDate] = useState(new Date());

  const insights = useMemo(() => getAdditionalInsights(activities), [activities]);
  const exchangeStats = useMemo(() => getExchangeStats(exchanges), [exchanges]);

  return (
    <>
      {/* 기간 선택 탭 */}
      <View style={styles.periodSelector}>
        {([
          { key: 'daily' as PeriodType, label: '일별' },
          { key: 'weekly' as PeriodType, label: '주별' },
          { key: 'monthly' as PeriodType, label: '월별' },
        ]).map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.periodTab, period === item.key && styles.periodTabActive]}
            onPress={() => setPeriod(item.key)}
          >
            <Text style={[styles.periodTabText, period === item.key && styles.periodTabTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 기간별 뷰 */}
      {period === 'daily' && (
        <DailyStatsView activities={activities} selectedDate={dailyDate} onDateChange={setDailyDate} />
      )}
      {period === 'weekly' && (
        <WeeklyStatsView activities={activities} selectedDate={weeklyDate} onDateChange={setWeeklyDate} />
      )}
      {period === 'monthly' && (
        <MonthlyStatsView
          activities={activities}
          exchanges={exchanges}
          selectedDate={monthlyDate}
          onDateChange={setMonthlyDate}
        />
      )}

      {/* 전체 인사이트 (항상 표시) */}
      <Card style={styles.monthCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>전체 인사이트</Text>
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>가장 생산적인 요일</Text>
            <Text style={styles.insightValue}>
              {insights.mostProductiveDayValue > 0
                ? `${insights.mostProductiveDay}요일 (${insights.mostProductiveDayValue.toFixed(1)}시간)`
                : '-'
              }
            </Text>
          </View>
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>승인율</Text>
            <Text style={styles.insightValue}>
              {insights.approvalTotal > 0
                ? `${insights.approvalRate.toFixed(0)}% (${insights.approvedCount}/${insights.approvalTotal})`
                : '-'
              }
            </Text>
          </View>
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>총 교환</Text>
            <Text style={styles.insightValue}>
              {exchangeStats.count > 0
                ? `${exchangeStats.totalHours}시간 / ${exchangeStats.totalAmount.toLocaleString()}원`
                : '-'
              }
            </Text>
          </View>
          <View style={[styles.insightRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.insightLabel}>활동 분포</Text>
            <View style={styles.distributionRow}>
              <Text style={[styles.distributionItem, { color: '#4A6B2E' }]}>
                벌기 {insights.distribution.earn.toFixed(0)}%
              </Text>
              <Text style={[styles.distributionItem, { color: '#A67B4B' }]}>
                쓰기 {insights.distribution.spend.toFixed(0)}%
              </Text>
              <Text style={[styles.distributionItem, { color: '#6D2B2B' }]}>
                벌금 {insights.distribution.penalty.toFixed(0)}%
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </>
  );
}

// 자녀 비교 뷰 (부모 전용)
function ChildComparisonView({ children, activities }: {
  children: ChildInfo[];
  activities: Activity[];
}) {
  const childStats = useMemo(() => children.map(child => {
    const childActs = activities.filter(a => a.userId === child.id);
    const earned = childActs.filter(a => a.type === 'earn' && a.approved).reduce((s, a) => s + a.earnedTime, 0);
    const spent = childActs.filter(a => a.type === 'spend').reduce((s, a) => s + a.duration, 0);
    const penalty = childActs.filter(a => a.type === 'penalty').reduce((s, a) => s + a.earnedTime, 0);
    const exchanged = childActs.filter(a => a.type === 'exchange').reduce((s, a) => s + a.duration, 0);
    return {
      name: child.name,
      earned,
      spent,
      penalty,
      balance: earned - spent - penalty - exchanged,
    };
  }), [children, activities]);

  const maxEarned = Math.max(...childStats.map(c => c.earned), 1);

  return (
    <Card style={styles.categoryCard}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>자녀 비교</Text>
        <View style={styles.comparisonLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4A6B2E' }]} />
            <Text style={styles.legendText}>벌기</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#A67B4B' }]} />
            <Text style={styles.legendText}>쓰기</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#6D2B2B' }]} />
            <Text style={styles.legendText}>벌금</Text>
          </View>
        </View>
        {childStats.map((child, index) => (
          <View key={index} style={styles.comparisonRow}>
            <Text style={styles.comparisonName}>{child.name}</Text>
            <View style={styles.comparisonBars}>
              <View style={styles.comparisonBarRow}>
                <View style={[styles.comparisonBar, {
                  backgroundColor: '#4A6B2E',
                  flex: child.earned / maxEarned,
                }]} />
                <Text style={styles.comparisonBarLabel}>{child.earned.toFixed(1)}h</Text>
              </View>
              <View style={styles.comparisonBarRow}>
                <View style={[styles.comparisonBar, {
                  backgroundColor: '#A67B4B',
                  flex: child.spent / maxEarned || 0.01,
                }]} />
                <Text style={styles.comparisonBarLabel}>{child.spent.toFixed(1)}h</Text>
              </View>
              <View style={styles.comparisonBarRow}>
                <View style={[styles.comparisonBar, {
                  backgroundColor: '#6D2B2B',
                  flex: child.penalty / maxEarned || 0.01,
                }]} />
                <Text style={styles.comparisonBarLabel}>{child.penalty.toFixed(1)}h</Text>
              </View>
            </View>
            <Text style={[styles.comparisonBalance, { color: child.balance >= 0 ? '#6B4226' : '#6D2B2B' }]}>
              잔액: {child.balance.toFixed(1)}시간
            </Text>
          </View>
        ))}
      </Card.Content>
    </Card>
  );
}

// 부모 통계 뷰
function ParentStatsView() {
  const user = useStore((state) => state.user);
  const activities = useStore((state) => state.activities);
  const exchanges = useStore((state) => state.exchanges);
  const children: ChildInfo[] = user?.children || [];
  const [selectedChildId, setSelectedChildId] = useState<string>(
    children.length > 0 ? children[0].id : '__compare__'
  );

  const showComparison = selectedChildId === '__compare__';

  const filteredActivities = useMemo(
    () => showComparison ? activities : activities.filter(a => a.userId === selectedChildId),
    [activities, selectedChildId, showComparison]
  );

  const filteredExchanges = useMemo(
    () => showComparison ? exchanges : exchanges.filter(e => e.userId === selectedChildId),
    [exchanges, selectedChildId, showComparison]
  );

  return (
    <>
      {/* 자녀 선택 + 전체 비교 */}
      <View style={styles.childSelector}>
        {children.length > 1 && (
          <Chip
            selected={showComparison}
            onPress={() => setSelectedChildId('__compare__')}
            style={[
              styles.childChip,
              showComparison && styles.childChipSelected,
            ]}
            textStyle={showComparison ? { color: '#FFFDF7' } : undefined}
          >
            전체 비교
          </Chip>
        )}
        {children.map((child) => (
          <Chip
            key={child.id}
            selected={selectedChildId === child.id}
            onPress={() => setSelectedChildId(child.id)}
            style={[
              styles.childChip,
              selectedChildId === child.id && styles.childChipSelected,
            ]}
            textStyle={selectedChildId === child.id ? { color: '#FFFDF7' } : undefined}
          >
            {child.name}
          </Chip>
        ))}
      </View>

      {children.length === 0 ? (
        <Surface style={styles.emptyContainer}>
          <Text style={styles.emptyText}>연결된 자녀가 없습니다</Text>
        </Surface>
      ) : showComparison ? (
        <ChildComparisonView children={children} activities={activities} />
      ) : (
        <ChildStatsView activities={filteredActivities} exchanges={filteredExchanges} />
      )}
    </>
  );
}

export default function StatsScreen() {
  const user = useStore((state) => state.user);
  const activities = useStore((state) => state.activities);
  const exchanges = useStore((state) => state.exchanges);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>통계</Text>
      </View>

      {user?.role === 'parent' ? (
        <ParentStatsView />
      ) : (
        <ChildStatsView activities={activities} exchanges={exchanges} />
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF7' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: 'bold', color: '#3E2723' },
  chartCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
  sectionTitle: { marginBottom: 12, fontWeight: 'bold' },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#8D6E63', fontSize: 12 },
  noDataContainer: { height: 200, alignItems: 'center', justifyContent: 'center' },
  noDataText: { color: '#A1887F' },
  weeklyTextSummary: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  dayColumn: { alignItems: 'center' },
  dayLabel: { fontSize: 11, color: '#A1887F', marginBottom: 2 },
  dayValue: { fontSize: 11 },
  monthCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
  monthGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  monthItem: { alignItems: 'center', flex: 1 },
  monthValue: { fontSize: 20, fontWeight: '600' },
  monthLabel: { color: '#A1887F', fontSize: 12, marginTop: 4 },
  categoryCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
  categoryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EFEBE9',
  },
  categoryLabelRow: { flexDirection: 'row', alignItems: 'center' },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  categoryLabel: { color: '#4E342E' },
  categoryValue: { fontWeight: '600' },
  childSelector: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8, flexWrap: 'wrap' },
  childChip: { backgroundColor: '#EFEBE9' },
  childChipSelected: { backgroundColor: '#6B4226' },
  emptyContainer: { margin: 16, padding: 32, borderRadius: 12, alignItems: 'center' },
  emptyText: { color: '#A1887F' },
  // Period selector
  periodSelector: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#D7CCC8', borderRadius: 12, padding: 4,
  },
  periodTab: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10,
  },
  periodTabActive: {
    backgroundColor: '#FFFDF7',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    elevation: 2,
  },
  periodTabText: { fontSize: 14, color: '#8D6E63', fontWeight: '500' },
  periodTabTextActive: { color: '#6B4226', fontWeight: 'bold' },
  // Date navigation
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  dateNavText: { fontSize: 16, fontWeight: '600', color: '#3E2723', minWidth: 140, textAlign: 'center' },
  // Daily activity list
  noDataContainerSmall: { paddingVertical: 32, alignItems: 'center' },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#EFEBE9',
  },
  activityTypeBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 10,
  },
  activityTypeBadgeText: { fontSize: 11, fontWeight: '600' },
  activityInfo: { flex: 1 },
  activityCategory: { fontSize: 14, color: '#4E342E', fontWeight: '500' },
  activityTime: { fontSize: 11, color: '#A1887F', marginTop: 2 },
  activityHours: { fontSize: 14, fontWeight: '600', marginRight: 4 },
  approvalDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },
  // Monthly extra
  monthExtraRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EFEBE9',
  },
  monthExtraText: { color: '#8D6E63', fontSize: 13 },
  // Exchange month row
  exchangeMonthRow: {
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#EFEBE9',
    alignItems: 'center',
  },
  exchangeMonthLabel: { color: '#8D6E63', fontSize: 13 },
  // Penalty
  penaltySummaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  // Insights
  insightRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EFEBE9',
  },
  insightLabel: { color: '#4E342E', fontSize: 14 },
  insightValue: { color: '#6B4226', fontWeight: '600', fontSize: 14 },
  distributionRow: { flexDirection: 'row', gap: 12 },
  distributionItem: { fontSize: 12, fontWeight: '600' },
  // Child comparison
  comparisonLegend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  comparisonRow: {
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EFEBE9',
  },
  comparisonName: { fontWeight: 'bold', color: '#3E2723', marginBottom: 8, fontSize: 15 },
  comparisonBars: { gap: 4 },
  comparisonBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 16 },
  comparisonBar: { height: 12, borderRadius: 6, minWidth: 4 },
  comparisonBarLabel: { fontSize: 11, color: '#8D6E63', minWidth: 32 },
  comparisonBalance: { marginTop: 6, fontSize: 13, fontWeight: '600' },
});
