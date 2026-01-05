import React from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Card, Text, Button, List, Divider, Avatar } from 'react-native-paper';
import { useStore } from '@/store/useStore';
import { EXCHANGE_RATE } from '@/constants/activities';

export default function SettingsScreen() {
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);

  // 데모용 데이터
  const demoUser = {
    name: '아달',
    email: 'child@example.com',
    role: 'child' as const,
    balance: 5.5,
    totalEarned: 50,
    totalSpent: 44.5,
  };

  const displayUser = user || demoUser;

  const handleExchange = () => {
    if (displayUser.balance < EXCHANGE_RATE.hours) {
      Alert.alert(
        '교환 불가',
        `잔액이 부족합니다. ${EXCHANGE_RATE.hours}시간 이상 필요합니다.`
      );
      return;
    }

    Alert.alert(
      '저금 교환',
      `${EXCHANGE_RATE.hours}시간을 ${EXCHANGE_RATE.amount.toLocaleString()}원으로 교환하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '교환',
          onPress: () => {
            Alert.alert('완료', '교환 요청이 전송되었습니다. 부모님 승인 후 처리됩니다.');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', onPress: () => logout() },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* 프로필 카드 */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text
            size={80}
            label={displayUser.name.charAt(0)}
            style={styles.avatar}
          />
          <Text variant="headlineSmall" style={styles.userName}>
            {displayUser.name}
          </Text>
          <Text variant="bodyMedium" style={styles.userEmail}>
            {displayUser.email}
          </Text>
          <View style={styles.roleContainer}>
            <Text style={styles.roleText}>
              {displayUser.role === 'child' ? '자녀 계정' : '부모 계정'}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* 시간 통계 */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            시간 통계
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={styles.statValue}>
                {displayUser.balance.toFixed(1)}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>현재 잔액</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statValue, styles.earnColor]}>
                {displayUser.totalEarned.toFixed(1)}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>총 번 시간</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statValue, styles.spendColor]}>
                {displayUser.totalSpent.toFixed(1)}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>총 쓴 시간</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 저금 교환 */}
      <Card style={styles.exchangeCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            저금 교환
          </Text>
          <Text variant="bodyMedium" style={styles.exchangeInfo}>
            {EXCHANGE_RATE.hours}시간 = {EXCHANGE_RATE.amount.toLocaleString()}원
          </Text>
          <Text variant="bodySmall" style={styles.exchangeHint}>
            현재 {Math.floor(displayUser.balance / EXCHANGE_RATE.hours)}회 교환 가능
            ({Math.floor(displayUser.balance / EXCHANGE_RATE.hours) * EXCHANGE_RATE.amount}원)
          </Text>
          <Button
            mode="contained"
            onPress={handleExchange}
            style={styles.exchangeButton}
            disabled={displayUser.balance < EXCHANGE_RATE.hours}
          >
            교환 신청
          </Button>
        </Card.Content>
      </Card>

      {/* 메뉴 */}
      <Card style={styles.menuCard}>
        <List.Item
          title="부모님 연결"
          description="부모님 계정과 연결합니다"
          left={(props) => <List.Icon {...props} icon="account-multiple" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Alert.alert('준비 중', '이 기능은 준비 중입니다.')}
        />
        <Divider />
        <List.Item
          title="알림 설정"
          description="기록 리마인더 알림을 설정합니다"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Alert.alert('준비 중', '이 기능은 준비 중입니다.')}
        />
        <Divider />
        <List.Item
          title="규칙 보기"
          description="시간 벌기/쓰기 규칙을 확인합니다"
          left={(props) => <List.Icon {...props} icon="book-open" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Alert.alert('준비 중', '이 기능은 준비 중입니다.')}
        />
      </Card>

      {/* 앱 정보 */}
      <Card style={styles.menuCard}>
        <List.Item
          title="앱 버전"
          description="1.0.0"
          left={(props) => <List.Icon {...props} icon="information" />}
        />
        <Divider />
        <List.Item
          title="개발자"
          description="Made with love for 아달"
          left={(props) => <List.Icon {...props} icon="heart" />}
        />
      </Card>

      {/* 로그아웃 */}
      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor="#EF4444"
      >
        로그아웃
      </Button>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
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
});
