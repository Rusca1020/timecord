import React, { useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { Card, Text, Button, List, Divider, Avatar, Portal, Dialog, Surface, TextInput, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import EmojiPicker, { type EmojiType } from 'rn-emoji-keyboard';
import { useStore, useComputedBalance, useTotalEarned, useTotalSpent } from '@/store/useStore';
import { EXCHANGE_RATE } from '@/constants/activities';
import { exportActivitiesAsCSV } from '@/services/exportService';
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
  const [exchangeDialogVisible, setExchangeDialogVisible] = React.useState(false);
  const [exchangeLoading, setExchangeLoading] = React.useState(false);
  const [editNameVisible, setEditNameVisible] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editNameLoading, setEditNameLoading] = React.useState(false);
  const [avatarVisible, setAvatarVisible] = React.useState(false);

  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const requestExchange = useStore((state) => state.requestExchange);
  const updateProfile = useStore((state) => state.updateProfile);
  const updateAvatar = useStore((state) => state.updateAvatar);

  const handleAvatarSelect = async (emojiObject: EmojiType) => {
    setAvatarVisible(false);
    const success = await updateAvatar(emojiObject.emoji);
    if (!success) {
      Alert.alert('오류', '아바타 변경에 실패했습니다.');
    }
  };

  const openEditName = () => {
    setEditName(user?.name || '');
    setEditNameVisible(true);
  };

  const confirmEditName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === user?.name) {
      setEditNameVisible(false);
      return;
    }
    setEditNameLoading(true);
    const success = await updateProfile(trimmed);
    setEditNameLoading(false);
    setEditNameVisible(false);
    if (success) {
      Alert.alert('완료', '이름이 변경되었습니다.');
    } else {
      Alert.alert('오류', '이름 변경에 실패했습니다.');
    }
  };
  const activities = useStore((state) => state.activities);
  const showSnackbar = useStore((state) => state.showSnackbar);
  const balance = useComputedBalance();
  const totalEarned = useTotalEarned();
  const totalSpent = useTotalSpent();

  const handleExport = useCallback(async () => {
    try {
      await exportActivitiesAsCSV(activities);
      showSnackbar('CSV 파일이 생성되었습니다.', 'success');
    } catch {
      showSnackbar('내보내기에 실패했습니다.', 'error');
    }
  }, [activities, showSnackbar]);

  const exchangeCount = Math.floor(balance / EXCHANGE_RATE.hours);
  const exchangeHours = EXCHANGE_RATE.hours;
  const exchangeAmount = EXCHANGE_RATE.amount;

  const confirmLogout = async () => {
    setLogoutDialogVisible(false);
    await logout();
  };

  const handleExchange = () => {
    if (balance < EXCHANGE_RATE.hours) {
      Alert.alert('교환 불가', `잔액이 부족합니다. ${EXCHANGE_RATE.hours}시간 이상 필요합니다.`);
      return;
    }
    setExchangeDialogVisible(true);
  };

  const confirmExchange = async () => {
    setExchangeLoading(true);
    try {
      const success = await requestExchange(exchangeHours);
      setExchangeDialogVisible(false);
      if (success) {
        Alert.alert('교환 신청 완료', '부모님의 승인을 기다려주세요.');
      } else {
        Alert.alert('오류', '교환 신청에 실패했습니다.');
      }
    } finally {
      setExchangeLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* 프로필 */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <TouchableOpacity onPress={() => setAvatarVisible(true)}>
            {user?.avatar ? (
              <View style={[styles.avatarEmoji, styles.avatar]}>
                <Text style={styles.avatarEmojiText}>{user.avatar}</Text>
              </View>
            ) : (
              <Avatar.Text size={80} label={(user?.name || '?').charAt(0)} style={styles.avatar} />
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditBadgeText}>edit</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.nameRow}>
            <Text variant="headlineSmall" style={styles.userName}>{user?.name}</Text>
            <IconButton icon="pencil" size={18} onPress={openEditName} style={styles.editIcon} />
          </View>
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
          left={(props) => <List.Icon {...props} icon="account-multiple" color={user?.parentId ? '#5D7B3A' : '#A1887F'} />}
          descriptionStyle={{ color: user?.parentId ? '#5D7B3A' : '#A1887F' }}
        />
        <Divider />
        <List.Item title="알림 설정" description="알림 종류별 수신 설정" left={(props) => <List.Icon {...props} icon="bell" color="#6B4226" />} onPress={() => router.push('/(tabs)/notification-settings' as any)} />
        <Divider />
        <List.Item title="규칙 보기" description="활동 규칙 및 배수 안내" left={(props) => <List.Icon {...props} icon="book-open" color="#6B4226" />} onPress={() => router.push('/(tabs)/rules' as any)} />
        <Divider />
        <List.Item title="데이터 내보내기" description="활동 내역 CSV 파일로 내보내기" left={(props) => <List.Icon {...props} icon="download" color="#6B4226" />} onPress={handleExport} />
      </Card>

      {/* 앱 정보 */}
      <Card style={styles.menuCard}>
        <List.Item title="앱 버전" description="1.0.0" left={(props) => <List.Icon {...props} icon="information" />} />
        <Divider />
        <List.Item title="개발자" description="Made with love for 아달" left={(props) => <List.Icon {...props} icon="heart" />} />
      </Card>

      <Button mode="outlined" onPress={() => setLogoutDialogVisible(true)} style={styles.logoutButton} textColor="#8B3A3A">로그아웃</Button>
      <View style={styles.bottomPadding} />

      {/* 로그아웃 다이얼로그 */}
      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
          <Dialog.Title>로그아웃</Dialog.Title>
          <Dialog.Content><Text>정말 로그아웃하시겠습니까?</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>취소</Button>
            <Button onPress={confirmLogout} textColor="#8B3A3A">로그아웃</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 교환 확인 다이얼로그 */}
      <Portal>
        <Dialog visible={exchangeDialogVisible} onDismiss={() => setExchangeDialogVisible(false)}>
          <Dialog.Title>저금 교환</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 8 }}>
              {exchangeHours}시간을 {exchangeAmount.toLocaleString()}원으로 교환하시겠습니까?
            </Text>
            <Text style={{ color: '#8D6E63', fontSize: 13 }}>
              현재 잔액: {balance.toFixed(1)}시간 → 교환 후: {(balance - exchangeHours).toFixed(1)}시간
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExchangeDialogVisible(false)} disabled={exchangeLoading}>취소</Button>
            <Button onPress={confirmExchange} loading={exchangeLoading} disabled={exchangeLoading}>교환 신청</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 이름 편집 다이얼로그 */}
      <Portal>
        <Dialog visible={editNameVisible} onDismiss={() => setEditNameVisible(false)}>
          <Dialog.Title>이름 변경</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="이름"
              value={editName}
              onChangeText={setEditName}
              mode="outlined"
              dense
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditNameVisible(false)} disabled={editNameLoading}>취소</Button>
            <Button onPress={confirmEditName} loading={editNameLoading} disabled={editNameLoading || !editName.trim()}>저장</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 이모지 아바타 선택 */}
      <EmojiPicker
        onEmojiSelected={handleAvatarSelect}
        open={avatarVisible}
        onClose={() => setAvatarVisible(false)}
        enableSearchBar
        enableRecentlyUsed
        categoryPosition="top"
        theme={{
          backdrop: '#00000050',
          knob: '#6B4226',
          category: { icon: '#6B4226', iconActive: '#6B4226', container: '#FFFFFF', containerActive: '#EFEBE9' },
          search: { background: '#EFEBE9', text: '#3E2723', placeholder: '#A1887F' },
        }}
      />

    </ScrollView>
  );
}

// ========== 부모 설정 화면 ==========
function ParentSettings() {
  const [logoutDialogVisible, setLogoutDialogVisible] = React.useState(false);
  const [editNameVisible, setEditNameVisible] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editNameLoading, setEditNameLoading] = React.useState(false);
  const [avatarVisible, setAvatarVisible] = React.useState(false);

  const user = useStore((state) => state.user);
  const activities = useStore((state) => state.activities);
  const logout = useStore((state) => state.logout);
  const updateProfile = useStore((state) => state.updateProfile);
  const updateAvatar = useStore((state) => state.updateAvatar);
  const showSnackbar = useStore((state) => state.showSnackbar);

  const handleExport = useCallback(async () => {
    try {
      await exportActivitiesAsCSV(activities);
      showSnackbar('CSV 파일이 생성되었습니다.', 'success');
    } catch {
      showSnackbar('내보내기에 실패했습니다.', 'error');
    }
  }, [activities, showSnackbar]);

  const handleAvatarSelect = async (emojiObject: EmojiType) => {
    setAvatarVisible(false);
    const success = await updateAvatar(emojiObject.emoji);
    if (!success) {
      Alert.alert('오류', '아바타 변경에 실패했습니다.');
    }
  };

  const openEditName = () => {
    setEditName(user?.name || '');
    setEditNameVisible(true);
  };

  const confirmEditName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === user?.name) {
      setEditNameVisible(false);
      return;
    }
    setEditNameLoading(true);
    const success = await updateProfile(trimmed);
    setEditNameLoading(false);
    setEditNameVisible(false);
    if (success) {
      Alert.alert('완료', '이름이 변경되었습니다.');
    } else {
      Alert.alert('오류', '이름 변경에 실패했습니다.');
    }
  };

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
          <TouchableOpacity onPress={() => setAvatarVisible(true)}>
            {user?.avatar ? (
              <View style={[styles.avatarEmoji, { backgroundColor: '#6B4226' }]}>
                <Text style={styles.avatarEmojiText}>{user.avatar}</Text>
              </View>
            ) : (
              <Avatar.Text size={80} label={(user?.name || '?').charAt(0)} style={[styles.avatar, { backgroundColor: '#6B4226' }]} />
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditBadgeText}>edit</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.nameRow}>
            <Text variant="headlineSmall" style={styles.userName}>{user?.name}</Text>
            <IconButton icon="pencil" size={18} onPress={openEditName} style={styles.editIcon} />
          </View>
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
          <Button mode="contained" icon="account-plus" onPress={() => router.push('/(tabs)/add-child')} style={{ marginTop: 12, backgroundColor: '#6B4226' }}>
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
                    <Avatar.Text size={40} label={child.name.charAt(0)} style={{ backgroundColor: '#6B4226' }} />
                    <View style={{ marginLeft: 12 }}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{child.name}</Text>
                      <Text variant="bodySmall" style={{ color: '#8D6E63' }}>{child.email}</Text>
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
        <List.Item title="알림 설정" description="알림 종류별 수신 설정" left={(props) => <List.Icon {...props} icon="bell" color="#6B4226" />} onPress={() => router.push('/(tabs)/notification-settings' as any)} />
        <Divider />
        <List.Item title="규칙 보기" description="활동 규칙 및 배수 안내" left={(props) => <List.Icon {...props} icon="book-open" color="#6B4226" />} onPress={() => router.push('/(tabs)/rules' as any)} />
        <Divider />
        <List.Item title="데이터 내보내기" description="활동 내역 CSV 파일로 내보내기" left={(props) => <List.Icon {...props} icon="download" color="#6B4226" />} onPress={handleExport} />
      </Card>

      {/* 앱 정보 */}
      <Card style={styles.menuCard}>
        <List.Item title="앱 버전" description="1.0.0" left={(props) => <List.Icon {...props} icon="information" />} />
        <Divider />
        <List.Item title="개발자" description="Made with love for 아달" left={(props) => <List.Icon {...props} icon="heart" />} />
      </Card>

      <Button mode="outlined" onPress={() => setLogoutDialogVisible(true)} style={styles.logoutButton} textColor="#8B3A3A">로그아웃</Button>
      <View style={styles.bottomPadding} />

      {/* 로그아웃 다이얼로그 */}
      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
          <Dialog.Title>로그아웃</Dialog.Title>
          <Dialog.Content><Text>정말 로그아웃하시겠습니까?</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>취소</Button>
            <Button onPress={confirmLogout} textColor="#8B3A3A">로그아웃</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 이름 편집 다이얼로그 */}
      <Portal>
        <Dialog visible={editNameVisible} onDismiss={() => setEditNameVisible(false)}>
          <Dialog.Title>이름 변경</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="이름"
              value={editName}
              onChangeText={setEditName}
              mode="outlined"
              dense
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditNameVisible(false)} disabled={editNameLoading}>취소</Button>
            <Button onPress={confirmEditName} loading={editNameLoading} disabled={editNameLoading || !editName.trim()}>저장</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 이모지 아바타 선택 */}
      <EmojiPicker
        onEmojiSelected={handleAvatarSelect}
        open={avatarVisible}
        onClose={() => setAvatarVisible(false)}
        enableSearchBar
        enableRecentlyUsed
        categoryPosition="top"
        theme={{
          backdrop: '#00000050',
          knob: '#6B4226',
          category: { icon: '#6B4226', iconActive: '#6B4226', container: '#FFFFFF', containerActive: '#EFEBE9' },
          search: { background: '#EFEBE9', text: '#3E2723', placeholder: '#A1887F' },
        }}
      />
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#6B4226',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  editIcon: {
    margin: 0,
    marginLeft: 4,
  },
  userName: {
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#8D6E63',
    marginTop: 4,
  },
  roleContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#EFEBE9',
    borderRadius: 16,
  },
  roleText: {
    color: '#6B4226',
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
    backgroundColor: '#D7CCC8',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#4E342E',
  },
  earnColor: {
    color: '#4A6B2E',
  },
  spendColor: {
    color: '#A67B4B',
  },
  statLabel: {
    color: '#A1887F',
    marginTop: 4,
  },
  exchangeCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  exchangeInfo: {
    color: '#6B4226',
    fontWeight: '500',
    marginBottom: 4,
  },
  exchangeHint: {
    color: '#A1887F',
    marginBottom: 16,
  },
  exchangeButton: {
    backgroundColor: '#6B4226',
  },
  menuCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderColor: '#8B3A3A',
  },
  bottomPadding: {
    height: 32,
  },
  // 부모 전용 스타일
  parentSectionTitle: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontWeight: 'bold',
    color: '#3E2723',
  },
  emptyCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8D6E63',
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
    backgroundColor: '#F0D6D6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingBadgeText: {
    color: '#6D2B2B',
    fontSize: 12,
    fontWeight: '500',
  },
  addChildButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderColor: '#6B4226',
  },
  avatarEmoji: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6B4226',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmojiText: {
    fontSize: 40,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6B4226',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  avatarEditBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
