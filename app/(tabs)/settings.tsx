import React from 'react';
import { StyleSheet, View, ScrollView, Alert, Platform } from 'react-native';
import { Card, Text, Button, List, Divider, Avatar, Portal, Dialog, Surface } from 'react-native-paper';
import { router } from 'expo-router';
import { useStore, useComputedBalance, useTotalEarned, useTotalSpent } from '@/store/useStore';
import { EXCHANGE_RATE } from '@/constants/activities';
import { Activity, ChildInfo } from '@/types';

// 자녀별 통계 계산 헬퍼
function computeChildStats(activities: Activity[], childId: string) {
  const childActivities = activities.filter(a => a.userId === childId);
  const earned = childActivities
    .filter(a => a.type === 'earn' && a.approved)
    .reduce((sum, a) => sum + a.earnedTime, 0);
  const spent = childActivities
    .filter(a => a.type === 'spend')
    .reduce((sum, a) => sum + a.duration, 0);
  const penalty = childActivities
    .filter(a => a.type === 'penalty')
    .reduce((sum, a) => sum + a.earnedTime, 0);
  const pending = childActivities.filter(a => !a.approved && a.requiresApproval).length;
  return { balance: earned - spent - penalty, earned, spent, pending };
}

// ========== 자녀 설정 화면 ==========
function ChildSettings() {
  const [logoutDialogVisible, setLogoutDialogVisible] = React.useState(false);

  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const balance = useComputedBalance();
  const totalEarned = useTotalEarned();
  const totalSpent = useTotalSpent();

  const confirmLogout = async () => {
    setLogoutDialogVisible(false);
    await logout();
  };

  const handleExchange = () => {
    if (balance < EXCHANGE_RATE.hours) {
      Alert.alert('교환 불가', `잔액이 부족합니다. ${EXCHANGE_RATE.hours}시간 이상 필요합니다.`);
      return;
    }
    Alert.alert(
      '저금 교환',
      `${EXCHANGE_RATE.hours}시간을 ${EXCHANGE_RATE.amount.toLocaleString()}원으로 교환하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { text: '교환', onPress: () => Alert.alert('완료', '교환 요청이 전송되었습니다.') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* 프로필 */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text size={80} label={(user?.name || '?').charAt(0)} style={styles.avatar} />
          <Text variant="headlineSmall" style={styles.userName}>{user?.name}</Text>
          <Text variant="bodyMedium" style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleContainer}>
            <Text style={styles.roleText}>자녀 계정</Text>
          </View>
        </Card.Content>
      </Card>

      {/* 시간 통계 */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>시간 통계</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={styles.statValue}>{balance.toFixed(1)}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>현재 잔액</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statValue, styles.earnColor]}>{totalEarned.toFixed(1)}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>총 번 시간</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statValue, styles.spendColor]}>{totalSpent.toFixed(1)}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>총 쓴 시간</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 저금 교환 */}
      <Card style={styles.exchangeCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>저금 교환</Text>
          <Text variant="bodyMedium" style={styles.exchangeInfo}>
            {EXCHANGE_RATE.hours}시간 = {EXCHANGE_RATE.amount.toLocaleString()}원
          </Text>
          <Text variant="bodySmall" style={styles.exchangeHint}>
            현재 {Math.floor(balance / EXCHANGE_RATE.hours)}회 교환 가능
            ({Math.floor(balance / EXCHANGE_RATE.hours) * EXCHANGE_RATE.amount}원)
          </Text>
          <Button mode="contained" onPress={handleExchange} style={styles.exchangeButton} disabled={balance < EXCHANGE_RATE.hours}>
            교환 신청
          </Button>
        </Card.Content>
      </Card>

      {/* 메뉴 */}
      <Card style={styles.menuCard}>
        <List.Item
          title="부모님 연결"
          description={user?.parentId ? '연결됨' : '연결되지 않음'}
          left={(props) => <List.Icon {...props} icon="account-multiple" color={user?.parentId ? '#10B981' : '#94A3B8'} />}
          descriptionStyle={{ color: user?.parentId ? '#10B981' : '#94A3B8' }}
        />
        <Divider />
        <List.Item title="알림 설정" description="준비 중" left={(props) => <List.Icon {...props} icon="bell" color="#94A3B8" />} titleStyle={{ color: '#94A3B8' }} descriptionStyle={{ color: '#CBD5E1' }} disabled />
        <Divider />
        <List.Item title="규칙 보기" description="준비 중" left={(props) => <List.Icon {...props} icon="book-open" color="#94A3B8" />} titleStyle={{ color: '#94A3B8' }} descriptionStyle={{ color: '#CBD5E1' }} disabled />
      </Card>

      {/* 앱 정보 */}
      <Card style={styles.menuCard}>
        <List.Item title="앱 버전" description="1.0.0" left={(props) => <List.Icon {...props} icon="information" />} />
        <Divider />
        <List.Item title="개발자" description="Made with love for 아달" left={(props) => <List.Icon {...props} icon="heart" />} />
      </Card>

      <Button mode="outlined" onPress={() => setLogoutDialogVisible(true)} style={styles.logoutButton} textColor="#EF4444">로그아웃</Button>
      <View style={styles.bottomPadding} />

      {/* 로그아웃 다이얼로그 */}
      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
          <Dialog.Title>로그아웃</Dialog.Title>
          <Dialog.Content><Text>정말 로그아웃하시겠습니까?</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>취소</Button>
            <Button onPress={confirmLogout} textColor="#EF4444">로그아웃</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

    </ScrollView>
  );
}

// ========== 부모 설정 화면 ==========
function ParentSettings() {
  const [logoutDialogVisible, setLogoutDialogVisible] = React.useState(false);
  const user = useStore((state) => state.user);
  const activities = useStore((state) => state.activities);
  const logout = useStore((state) => state.logout);

  const children: ChildInfo[] = user?.children || [];

  const confirmLogout = async () => {
    setLogoutDialogVisible(false);
    await logout();
  };

  return (
    <ScrollView style={styles.container}>
      {/* 프로필 */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text size={80} label={(user?.name || '?').charAt(0)} style={[styles.avatar, { backgroundColor: '#6366F1' }]} />
          <Text variant="headlineSmall" style={styles.userName}>{user?.name}</Text>
          <Text variant="bodyMedium" style={styles.userEmail}>{user?.email}</Text>
          <View style={[styles.roleContainer, { backgroundColor: '#F0FDF4' }]}>
            <Text style={[styles.roleText, { color: '#16A34A' }]}>부모 계정</Text>
          </View>
        </Card.Content>
      </Card>

      {/* 자녀 현황 */}
      <Text variant="titleMedium" style={styles.parentSectionTitle}>
        자녀 현황 ({children.length}명)
      </Text>

      {children.length === 0 ? (
        <Surface style={styles.emptyCard}>
          <Text style={styles.emptyText}>연결된 자녀가 없습니다.</Text>
          <Button mode="contained" icon="account-plus" onPress={() => router.push('/(tabs)/add-child')} style={{ marginTop: 12, backgroundColor: '#6366F1' }}>
            자녀 연결하기
          </Button>
        </Surface>
      ) : (
        children.map((child) => {
          const stats = computeChildStats(activities, child.id);
          return (
            <Card key={child.id} style={styles.childStatsCard}>
              <Card.Content>
                <View style={styles.childHeader}>
                  <View style={styles.childInfo}>
                    <Avatar.Text size={40} label={child.name.charAt(0)} style={{ backgroundColor: '#6366F1' }} />
                    <View style={{ marginLeft: 12 }}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{child.name}</Text>
                      <Text variant="bodySmall" style={{ color: '#64748B' }}>{child.email}</Text>
                    </View>
                  </View>
                  {stats.pending > 0 && (
                    <Surface style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>{stats.pending}건 대기</Text>
                    </Surface>
                  )}
                </View>
                <View style={[styles.statsRow, { marginTop: 16 }]}>
                  <View style={styles.statItem}>
                    <Text variant="titleLarge" style={styles.statValue}>{stats.balance.toFixed(1)}</Text>
                    <Text variant="bodySmall" style={styles.statLabel}>잔액</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text variant="titleLarge" style={[styles.statValue, styles.earnColor]}>{stats.earned.toFixed(1)}</Text>
                    <Text variant="bodySmall" style={styles.statLabel}>번 시간</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text variant="titleLarge" style={[styles.statValue, styles.spendColor]}>{stats.spent.toFixed(1)}</Text>
                    <Text variant="bodySmall" style={styles.statLabel}>쓴 시간</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          );
        })
      )}

      {/* 자녀 추가 버튼 (자녀가 있을 때) */}
      {children.length > 0 && (
        <Button
          mode="outlined"
          icon="account-plus"
          onPress={() => router.push('/(tabs)/add-child')}
          style={styles.addChildButton}
        >
          자녀 추가 연결
        </Button>
      )}

      {/* 메뉴 */}
      <Card style={styles.menuCard}>
        <List.Item title="알림 설정" description="준비 중" left={(props) => <List.Icon {...props} icon="bell" color="#94A3B8" />} titleStyle={{ color: '#94A3B8' }} descriptionStyle={{ color: '#CBD5E1' }} disabled />
        <Divider />
        <List.Item title="규칙 관리" description="준비 중" left={(props) => <List.Icon {...props} icon="book-open" color="#94A3B8" />} titleStyle={{ color: '#94A3B8' }} descriptionStyle={{ color: '#CBD5E1' }} disabled />
      </Card>

      {/* 앱 정보 */}
      <Card style={styles.menuCard}>
        <List.Item title="앱 버전" description="1.0.0" left={(props) => <List.Icon {...props} icon="information" />} />
        <Divider />
        <List.Item title="개발자" description="Made with love for 아달" left={(props) => <List.Icon {...props} icon="heart" />} />
      </Card>

      <Button mode="outlined" onPress={() => setLogoutDialogVisible(true)} style={styles.logoutButton} textColor="#EF4444">로그아웃</Button>
      <View style={styles.bottomPadding} />

      {/* 로그아웃 다이얼로그 */}
      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
          <Dialog.Title>로그아웃</Dialog.Title>
          <Dialog.Content><Text>정말 로그아웃하시겠습니까?</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>취소</Button>
            <Button onPress={confirmLogout} textColor="#EF4444">로그아웃</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

// ========== 메인 export ==========
export default function SettingsScreen() {
  const user = useStore((state) => state.user);
  return user?.role === 'parent' ? <ParentSettings /> : <ChildSettings />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  profileCard: {
    margin: 16,
    borderRadius: 16,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    backgroundColor: '#6366F1',
  },
  userName: {
    marginTop: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#64748B',
    marginTop: 4,
  },
  roleContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
  },
  roleText: {
    color: '#6366F1',
    fontWeight: '500',
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#334155',
  },
  earnColor: {
    color: '#059669',
  },
  spendColor: {
    color: '#D97706',
  },
  statLabel: {
    color: '#94A3B8',
    marginTop: 4,
  },
  exchangeCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  exchangeInfo: {
    color: '#6366F1',
    fontWeight: '500',
    marginBottom: 4,
  },
  exchangeHint: {
    color: '#94A3B8',
    marginBottom: 16,
  },
  exchangeButton: {
    backgroundColor: '#6366F1',
  },
  menuCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderColor: '#EF4444',
  },
  bottomPadding: {
    height: 32,
  },
  // 부모 전용 스타일
  parentSectionTitle: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  emptyCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
  },
  childStatsCard: {
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
  addChildButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderColor: '#6366F1',
  },
});
