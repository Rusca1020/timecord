import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Text, Chip, Surface, SegmentedButtons, Searchbar, Portal, Dialog, Button, TextInput, Menu, IconButton } from 'react-native-paper';
import { useStore } from '@/store/useStore';
import { getCategoryLabel } from '@/constants/categoryNames';
import { exportActivitiesAsCSV } from '@/services/exportService';
import { Activity } from '@/types';

type FilterType = 'all' | 'earn' | 'spend' | 'penalty';

export default function HistoryScreen() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const activities = useStore((state) => state.activities);
  const user = useStore((state) => state.user);
  const removeActivity = useStore((state) => state.removeActivity);
  const editActivity = useStore((state) => state.editActivity);
  const loadActivities = useStore((state) => state.loadActivities);
  const showSnackbar = useStore((state) => state.showSnackbar);
  const isParent = user?.role === 'parent';

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  }, [loadActivities]);

  const handleExport = useCallback(async () => {
    try {
      await exportActivitiesAsCSV(activities);
      showSnackbar('CSV 파일이 생성되었습니다.', 'success');
    } catch {
      showSnackbar('내보내기에 실패했습니다.', 'error');
    }
  }, [activities, showSnackbar]);

  // 수정/삭제 상태
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [editTarget, setEditTarget] = useState<Activity | null>(null);
  const [editDuration, setEditDuration] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const getActivityLabel = (activity: Activity) => getCategoryLabel(activity.category);

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (filter !== 'all' && activity.type !== filter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const label = getActivityLabel(activity).toLowerCase();
        const userName = (activity.userName || '').toLowerCase();
        const description = (activity.description || '').toLowerCase();
        return label.includes(query) || userName.includes(query) || description.includes(query);
      }
      return true;
    });
  }, [activities, filter, searchQuery]);

  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = activity.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, Activity[]>);

  const sortedDates = Object.keys(groupedActivities).sort((a, b) => b.localeCompare(a));

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return `${month}/${day} ${dayNames[date.getDay()]}요일`;
  };

  const isToday = (dateStr: string) => dateStr === new Date().toISOString().split('T')[0];

  // 수정/삭제 가능 여부
  const canModify = (activity: Activity) => {
    if (isParent) return true; // 부모는 자녀 활동 삭제 가능
    return activity.userId === user?.id; // 자녀는 자기 것만
  };

  const canEdit = (activity: Activity) => {
    if (isParent) return false; // 부모는 자녀 활동 수정 불가
    if (activity.type === 'penalty') return false; // 벌금은 수정 불가
    if (activity.type === 'exchange') return false; // 교환은 수정 불가
    return activity.userId === user?.id;
  };

  const openEditDialog = (activity: Activity) => {
    setEditTarget(activity);
    setEditDuration(activity.duration.toString());
    setEditDescription(activity.description || '');
    setEditStartTime(activity.startTime || '');
    setEditEndTime(activity.endTime || '');
    setMenuVisible(null);
  };

  const confirmEdit = async () => {
    if (!editTarget) return;
    setEditLoading(true);

    const duration = parseFloat(editDuration);
    if (isNaN(duration) || duration <= 0) {
      setEditLoading(false);
      return;
    }

    const multiplier = editTarget.multiplier;
    const earnedTime = duration * multiplier;

    await editActivity(editTarget.id, {
      duration,
      earnedTime,
      description: editDescription || undefined,
      startTime: editStartTime || undefined,
      endTime: editEndTime || undefined,
    });

    setEditLoading(false);
    setEditTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await removeActivity(deleteTarget.id);
    setDeleteTarget(null);
  };

  const renderActivityItem = (activity: Activity) => {
    const isEarn = activity.type === 'earn';
    const isSpend = activity.type === 'spend';
    const isPenalty = activity.type === 'penalty';
    const showMenu = canModify(activity);

    return (
      <Surface key={activity.id} style={styles.activityItem}>
        <TouchableOpacity
          activeOpacity={0.7}
          onLongPress={() => showMenu && setMenuVisible(activity.id)}
          delayLongPress={400}
        >
          <View style={styles.activityHeader}>
            <Chip
              compact
              style={[
                styles.typeChip,
                isEarn && styles.earnChip,
                isSpend && styles.spendChip,
                isPenalty && styles.penaltyChip,
              ]}
              textStyle={styles.chipText}
            >
              {isEarn ? '벌기' : isSpend ? '쓰기' : isPenalty ? '벌금' : '중립'}
            </Chip>
            <Text variant="bodyMedium" style={styles.activityLabel}>
              {getActivityLabel(activity)}
            </Text>
            {showMenu && (
              <Menu
                visible={menuVisible === activity.id}
                onDismiss={() => setMenuVisible(null)}
                anchor={
                  <TouchableOpacity onPress={() => setMenuVisible(activity.id)} style={styles.menuTrigger}>
                    <Text style={styles.menuDots}>⋮</Text>
                  </TouchableOpacity>
                }
              >
                {canEdit(activity) && (
                  <Menu.Item onPress={() => openEditDialog(activity)} title="수정" leadingIcon="pencil" />
                )}
                <Menu.Item
                  onPress={() => { setMenuVisible(null); setDeleteTarget(activity); }}
                  title="삭제"
                  leadingIcon="delete"
                  titleStyle={{ color: '#6D2B2B' }}
                />
              </Menu>
            )}
          </View>
          <View style={styles.activityDetails}>
            {isParent && activity.userName && (
              <Text variant="bodySmall" style={styles.userNameText}>
                {activity.userName}
              </Text>
            )}
            {activity.startTime && activity.endTime && (
              <Text variant="bodySmall" style={styles.timeText}>
                {activity.startTime} - {activity.endTime}
              </Text>
            )}
            {activity.description && (
              <Text variant="bodySmall" style={styles.descriptionText}>
                {activity.description}
              </Text>
            )}
          </View>
          <View style={styles.activityTime}>
            <Text
              variant="titleMedium"
              style={[
                styles.timeValue,
                isEarn && styles.earnText,
                isSpend && styles.spendText,
                isPenalty && styles.penaltyText,
              ]}
            >
              {isEarn ? '+' : '-'}{activity.earnedTime.toFixed(1)}시간
            </Text>
            {!activity.approved && (
              <Text variant="bodySmall" style={styles.pendingText}>승인 대기</Text>
            )}
          </View>
        </TouchableOpacity>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Searchbar
          placeholder={isParent ? "이름, 활동, 메모 검색" : "활동, 메모 검색"}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBarFlex}
        />
        <IconButton icon="download" size={24} onPress={handleExport} style={styles.exportButton} />
      </View>
      <SegmentedButtons
        value={filter}
        onValueChange={(value) => setFilter(value as FilterType)}
        buttons={[
          { value: 'all', label: '전체' },
          { value: 'earn', label: '벌기' },
          { value: 'spend', label: '쓰기' },
          { value: 'penalty', label: '벌금' },
        ]}
        style={styles.filter}
      />

      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6B4226']} />}
      >
        {sortedDates.map((date) => {
          const dateActivities = groupedActivities[date];

          if (isParent) {
            const byChild: Record<string, { name: string; activities: Activity[] }> = {};
            dateActivities.forEach(a => {
              const key = a.userId;
              if (!byChild[key]) byChild[key] = { name: a.userName || '알 수 없음', activities: [] };
              byChild[key].activities.push(a);
            });

            return (
              <View key={date} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <Text variant="titleMedium" style={styles.dateText}>
                    {formatDate(date)}
                    {isToday(date) && <Text style={styles.todayBadge}> 오늘</Text>}
                  </Text>
                </View>
                {Object.entries(byChild).map(([childId, { name, activities: childActs }]) => {
                  const earned = childActs.filter(a => a.type === 'earn' && a.approved).reduce((s, a) => s + a.earnedTime, 0);
                  const spent = childActs.filter(a => a.type === 'spend').reduce((s, a) => s + a.duration, 0);
                  return (
                    <View key={childId} style={styles.childGroup}>
                      <View style={styles.childGroupHeader}>
                        <Text variant="bodyMedium" style={styles.childGroupName}>{name}</Text>
                        <Text variant="bodySmall" style={styles.summaryText}>
                          {earned.toFixed(1)}시간 벌기 / {spent.toFixed(1)}시간 쓰기
                        </Text>
                      </View>
                      {childActs.map(renderActivityItem)}
                    </View>
                  );
                })}
              </View>
            );
          }

          return (
            <View key={date} style={styles.dateGroup}>
              <View style={styles.dateHeader}>
                <Text variant="titleMedium" style={styles.dateText}>
                  {formatDate(date)}
                  {isToday(date) && <Text style={styles.todayBadge}> 오늘</Text>}
                </Text>
                <Text variant="bodySmall" style={styles.summaryText}>
                  {dateActivities.filter(a => a.type === 'earn' && a.approved).reduce((sum, a) => sum + a.earnedTime, 0).toFixed(1)}시간 벌기 /
                  {dateActivities.filter(a => a.type === 'spend').reduce((sum, a) => sum + a.duration, 0).toFixed(1)}시간 쓰기
                </Text>
              </View>
              {dateActivities.map(renderActivityItem)}
            </View>
          );
        })}
        {sortedDates.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              기록이 없습니다
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 삭제 확인 다이얼로그 */}
      <Portal>
        <Dialog visible={deleteTarget !== null} onDismiss={() => setDeleteTarget(null)}>
          <Dialog.Title>활동 삭제</Dialog.Title>
          <Dialog.Content>
            {deleteTarget && (
              <Text>
                "{getActivityLabel(deleteTarget)}" ({deleteTarget.earnedTime.toFixed(1)}시간) 활동을 삭제하시겠습니까?
                {deleteTarget.approved && deleteTarget.type === 'earn' && '\n\n승인된 활동을 삭제하면 잔액에 반영됩니다.'}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteTarget(null)}>취소</Button>
            <Button onPress={confirmDelete} textColor="#6D2B2B">삭제</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 수정 다이얼로그 */}
      <Portal>
        <Dialog visible={editTarget !== null} onDismiss={() => setEditTarget(null)}>
          <Dialog.Title>활동 수정</Dialog.Title>
          <Dialog.Content>
            {editTarget && (
              <>
                <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                  {getActivityLabel(editTarget)}
                  {editTarget.approved && editTarget.type === 'earn' && (
                    <Text style={{ color: '#C49A6C' }}> (승인됨 - 잔액 변동)</Text>
                  )}
                </Text>
                <TextInput
                  label={`시간 (×${editTarget.multiplier}배 = ${(parseFloat(editDuration || '0') * editTarget.multiplier).toFixed(1)}시간)`}
                  value={editDuration}
                  onChangeText={setEditDuration}
                  keyboardType="decimal-pad"
                  mode="outlined"
                  dense
                  style={{ marginBottom: 12 }}
                />
                <View style={styles.editTimeRow}>
                  <TextInput
                    label="시작 시간"
                    value={editStartTime}
                    onChangeText={setEditStartTime}
                    placeholder="HH:MM"
                    mode="outlined"
                    dense
                    style={styles.editTimeInput}
                  />
                  <TextInput
                    label="끝 시간"
                    value={editEndTime}
                    onChangeText={setEditEndTime}
                    placeholder="HH:MM"
                    mode="outlined"
                    dense
                    style={styles.editTimeInput}
                  />
                </View>
                <TextInput
                  label="메모"
                  value={editDescription}
                  onChangeText={setEditDescription}
                  mode="outlined"
                  dense
                  style={{ marginTop: 12 }}
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditTarget(null)}>취소</Button>
            <Button onPress={confirmEdit} loading={editLoading} disabled={editLoading}>저장</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 4,
  },
  searchBarFlex: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  exportButton: {
    margin: 0,
  },
  filter: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  listContainer: {
    flex: 1,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  dateText: {
    color: '#4E342E',
  },
  todayBadge: {
    color: '#6B4226',
    fontWeight: 'bold',
  },
  summaryText: {
    color: '#A1887F',
    marginTop: 2,
  },
  activityItem: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeChip: {
    marginRight: 8,
  },
  earnChip: {
    backgroundColor: '#E8F0E0',
  },
  spendChip: {
    backgroundColor: '#F5ECD7',
  },
  penaltyChip: {
    backgroundColor: '#F0D6D6',
  },
  chipText: {
    fontSize: 12,
  },
  activityLabel: {
    flex: 1,
    fontWeight: '500',
  },
  menuTrigger: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  menuDots: {
    fontSize: 18,
    color: '#A1887F',
    fontWeight: 'bold',
  },
  activityDetails: {
    marginBottom: 8,
  },
  userNameText: {
    color: '#6B4226',
    fontWeight: '500',
    marginBottom: 2,
  },
  timeText: {
    color: '#8D6E63',
  },
  descriptionText: {
    color: '#A1887F',
    marginTop: 2,
  },
  activityTime: {
    alignItems: 'flex-end',
  },
  timeValue: {
    fontWeight: 'bold',
  },
  earnText: {
    color: '#4A6B2E',
  },
  spendText: {
    color: '#A67B4B',
  },
  penaltyText: {
    color: '#6D2B2B',
  },
  pendingText: {
    color: '#6B4226',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#A1887F',
  },
  childGroup: {
    marginBottom: 8,
  },
  childGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
    marginTop: 4,
  },
  childGroupName: {
    fontWeight: '600',
    color: '#6B4226',
  },
  editTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editTimeInput: {
    flex: 1,
  },
});
