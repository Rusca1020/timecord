import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Pressable } from 'react-native';
import { Card, Text, Button, TextInput, SegmentedButtons, Chip, Portal, Dialog, RadioButton } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store/useStore';
import { EARN_ACTIVITIES, SPEND_ACTIVITIES, NEUTRAL_ACTIVITIES } from '@/constants/activities';
import { EarnCategory, SpendCategory, NeutralCategory, CustomActivity, ApproverType } from '@/types';

type RecordType = 'earn' | 'spend' | 'neutral';

// 시간 문자열(HH:MM)을 분으로 변환
const timeToMinutes = (time: string): number | null => {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

// 시작/종료 시간으로 duration(시간) 계산
const calculateDurationFromTimes = (start: string, end: string): number | null => {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return null;

  let diff = endMinutes - startMinutes;
  // 자정을 넘기는 경우 처리 (예: 23:00 ~ 01:00)
  if (diff < 0) diff += 24 * 60;

  return diff / 60; // 시간 단위로 반환
};

export default function RecordScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const [recordType, setRecordType] = useState<RecordType>((type as RecordType) || 'earn');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [duration, setDuration] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [startTimeError, setStartTimeError] = useState('');
  const [endTimeError, setEndTimeError] = useState('');
  const [description, setDescription] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isAutoCalculated, setIsAutoCalculated] = useState(false);

  // 커스텀 활동 추가 다이얼로그
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newMultiplier, setNewMultiplier] = useState('1');
  const [newRequiresApproval, setNewRequiresApproval] = useState(false);
  const [newApproverType, setNewApproverType] = useState<ApproverType>('mom');

  // URL 파라미터로 탭 전환
  useEffect(() => {
    if (type === 'earn' || type === 'spend' || type === 'neutral') {
      setRecordType(type);
      setSelectedCategory(null);
    }
  }, [type]);

  // 시작/종료 시간이 변경되면 duration 자동 계산
  useEffect(() => {
    if (startTime && endTime) {
      const calculated = calculateDurationFromTimes(startTime, endTime);
      if (calculated !== null && calculated > 0) {
        setDuration(calculated.toFixed(1));
        setIsAutoCalculated(true);
      }
    } else {
      setIsAutoCalculated(false);
    }
  }, [startTime, endTime]);

  const user = useStore((state) => state.user);
  const addActivity = useStore((state) => state.addActivity);
  const customActivities = useStore((state) => state.customActivities);
  const addCustomActivity = useStore((state) => state.addCustomActivity);
  const removeCustomActivity = useStore((state) => state.removeCustomActivity);

  const earnCategories = Object.entries(EARN_ACTIVITIES);
  const spendCategories = Object.entries(SPEND_ACTIVITIES);
  const neutralCategories = Object.entries(NEUTRAL_ACTIVITIES);

  // 현재 탭에 해당하는 커스텀 활동 필터
  const customForType = customActivities.filter(a => a.type === recordType);

  // 선택된 카테고리가 커스텀 활동인지 확인
  const getCustomActivity = (categoryId: string): CustomActivity | undefined => {
    return customActivities.find(a => `custom_${a.id}` === categoryId);
  };

  const isCustomCategory = (categoryId: string | null): boolean => {
    return !!categoryId && categoryId.startsWith('custom_');
  };

  const getSelectedActivity = (): {
    label: string;
    description: string;
    multiplier?: number;
    fixedHours?: number;
    requiresApproval?: boolean;
    approverType?: ApproverType;
  } | null => {
    if (!selectedCategory) return null;

    // 커스텀 활동인 경우
    const custom = getCustomActivity(selectedCategory);
    if (custom) {
      return {
        label: custom.label,
        multiplier: custom.multiplier,
        requiresApproval: custom.requiresApproval,
        approverType: custom.approverType,
        description: custom.description,
      };
    }

    if (recordType === 'earn') {
      return EARN_ACTIVITIES[selectedCategory as EarnCategory];
    } else if (recordType === 'spend') {
      return SPEND_ACTIVITIES[selectedCategory as SpendCategory];
    } else {
      return NEUTRAL_ACTIVITIES[selectedCategory as NeutralCategory];
    }
  };

  const calculateEarnedTime = () => {
    if (recordType !== 'earn' || !selectedCategory) return 0;

    // 커스텀 활동
    const custom = getCustomActivity(selectedCategory);
    if (custom) {
      return parseFloat(duration || '0') * custom.multiplier;
    }

    const activity = EARN_ACTIVITIES[selectedCategory as EarnCategory];
    if (!activity) return 0;
    if (activity.fixedHours) {
      return activity.fixedHours;
    }
    return parseFloat(duration || '0') * activity.multiplier;
  };

  const handleSubmit = () => {
    if (!selectedCategory) {
      Alert.alert('알림', '활동을 선택해주세요.');
      return;
    }
    const isFixedHours = !isCustomCategory(selectedCategory) &&
      recordType === 'earn' &&
      EARN_ACTIVITIES[selectedCategory as EarnCategory]?.fixedHours;
    if (recordType !== 'neutral' && !duration && !isFixedHours) {
      Alert.alert('알림', '시간을 입력해주세요.');
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    const activity = getSelectedActivity();
    if (!activity) return;

    const now = new Date();
    const earnedTime = recordType === 'earn'
      ? calculateEarnedTime()
      : recordType === 'spend'
        ? -parseFloat(duration || '0')  // spend는 음수 (시간 소비)
        : 0;  // neutral은 0 (시간 영향 없음)

    const custom = getCustomActivity(selectedCategory!);
    const requiresApproval = custom
      ? custom.requiresApproval
      : recordType === 'earn' && EARN_ACTIVITIES[selectedCategory as EarnCategory]?.requiresApproval;
    const approved = recordType === 'earn' ? !requiresApproval : true;

    const multiplier = custom
      ? custom.multiplier
      : recordType === 'earn' ? (EARN_ACTIVITIES[selectedCategory as EarnCategory]?.multiplier || 1) : 1;

    const approverType = custom
      ? custom.approverType
      : recordType === 'earn' ? EARN_ACTIVITIES[selectedCategory as EarnCategory]?.approverType : null;

    // category: 커스텀이면 custom_{id} 형태로 저장
    const category = selectedCategory!;

    // id와 createdAt은 DB에서 자동 생성
    const newActivity = {
      userId: user?.id || '',
      userName: user?.name || '',
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      type: recordType,
      category,
      duration: parseFloat(duration || '0'),
      multiplier,
      earnedTime,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      description: description || undefined,
      requiresApproval: requiresApproval || false,
      approverType,
      approved,
    };

    const success = await addActivity(newActivity);

    setShowConfirm(false);
    if (success) {
      resetForm();
      Alert.alert(
        '완료',
        requiresApproval
          ? '기록이 저장되었습니다. 부모님 승인 후 시간이 반영됩니다.'
          : '기록이 저장되었습니다!'
      );
    } else {
      Alert.alert('오류', '기록 저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const validateTimeInput = (value: string): string => {
    if (!value) return '';
    // 입력 중에는 부분 입력 허용
    if (/^\d{0,2}:?\d{0,2}$/.test(value)) return '';
    // 완성된 입력이면 형식 확인
    if (value.includes(':') && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(value)) {
      return 'HH:MM 형식으로 입력하세요 (예: 14:00)';
    }
    return '';
  };

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    setStartTimeError(validateTimeInput(value));
  };

  const handleEndTimeChange = (value: string) => {
    setEndTime(value);
    setEndTimeError(validateTimeInput(value));
  };

  const resetForm = () => {
    setSelectedCategory(null);
    setDuration('');
    setStartTime('');
    setEndTime('');
    setStartTimeError('');
    setEndTimeError('');
    setDescription('');
  };

  // 커스텀 활동 추가 다이얼로그 리셋
  const resetAddDialog = () => {
    setNewLabel('');
    setNewMultiplier('1');
    setNewRequiresApproval(false);
    setNewApproverType('mom');
    setShowAddDialog(false);
  };

  const handleAddCustomActivity = async () => {
    if (!newLabel.trim()) {
      Alert.alert('알림', '활동 이름을 입력해주세요.');
      return;
    }

    const success = await addCustomActivity({
      type: recordType,
      label: newLabel.trim(),
      multiplier: recordType === 'earn' ? parseFloat(newMultiplier) : 1,
      requiresApproval: recordType === 'earn' ? newRequiresApproval : false,
      approverType: recordType === 'earn' && newRequiresApproval ? newApproverType : null,
      description: '',
    });

    if (success) {
      resetAddDialog();
    } else {
      Alert.alert('오류', '활동 추가에 실패했습니다.');
    }
  };

  const handleDeleteCustomActivity = (custom: CustomActivity) => {
    Alert.alert(
      '삭제 확인',
      `"${custom.label}" 활동을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const success = await removeCustomActivity(custom.id);
            if (success) {
              if (selectedCategory === `custom_${custom.id}`) {
                setSelectedCategory(null);
              }
            } else {
              Alert.alert('오류', '삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  // 현재 선택에 fixedHours가 있는지 (커스텀은 fixedHours 없음)
  const hasFixedHours = !isCustomCategory(selectedCategory) &&
    recordType === 'earn' &&
    selectedCategory &&
    EARN_ACTIVITIES[selectedCategory as EarnCategory]?.fixedHours;

  // 선택된 활동의 승인 정보 표시
  const selectedActivity = getSelectedActivity();
  const selectedCustom = selectedCategory ? getCustomActivity(selectedCategory) : undefined;

  return (
    <ScrollView style={styles.container}>
      {/* 기록 타입 선택 */}
      <SegmentedButtons
        value={recordType}
        onValueChange={(value) => {
          setRecordType(value as RecordType);
          setSelectedCategory(null);
        }}
        buttons={[
          { value: 'earn', label: '시간 벌기', style: recordType === 'earn' ? styles.earnButton : {} },
          { value: 'spend', label: '시간 쓰기', style: recordType === 'spend' ? styles.spendButton : {} },
          { value: 'neutral', label: '중립', style: recordType === 'neutral' ? styles.neutralButton : {} },
        ]}
        style={styles.segmentedButtons}
      />

      {/* 활동 선택 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            활동 선택
          </Text>
          <View style={styles.chipContainer}>
            {recordType === 'earn' && earnCategories.map(([key, activity]) => (
              <Chip
                key={key}
                selected={selectedCategory === key}
                onPress={() => setSelectedCategory(key)}
                style={[
                  styles.chip,
                  selectedCategory === key && styles.chipSelected
                ]}
                textStyle={selectedCategory === key ? styles.chipTextSelected : {}}
              >
                {activity.label}
                {activity.multiplier > 1 && ` (${activity.multiplier}배)`}
                {activity.fixedHours && ` (+${activity.fixedHours}시간)`}
              </Chip>
            ))}
            {recordType === 'spend' && spendCategories.map(([key, activity]) => (
              <Chip
                key={key}
                selected={selectedCategory === key}
                onPress={() => setSelectedCategory(key)}
                style={[
                  styles.chip,
                  selectedCategory === key && styles.chipSelectedSpend
                ]}
                textStyle={selectedCategory === key ? styles.chipTextSelected : {}}
              >
                {activity.label}
              </Chip>
            ))}
            {recordType === 'neutral' && neutralCategories.map(([key, activity]) => (
              <Chip
                key={key}
                selected={selectedCategory === key}
                onPress={() => setSelectedCategory(key)}
                style={[
                  styles.chip,
                  selectedCategory === key && styles.chipSelectedNeutral
                ]}
                textStyle={selectedCategory === key ? styles.chipTextSelected : {}}
              >
                {activity.label}
              </Chip>
            ))}

            {/* 커스텀 활동 Chip */}
            {customForType.map((custom) => {
              const chipKey = `custom_${custom.id}`;
              const isSelected = selectedCategory === chipKey;
              const selectedStyle = recordType === 'earn'
                ? styles.chipSelected
                : recordType === 'spend'
                  ? styles.chipSelectedSpend
                  : styles.chipSelectedNeutral;
              return (
                <Pressable
                  key={chipKey}
                  onLongPress={() => handleDeleteCustomActivity(custom)}
                >
                  <Chip
                    selected={isSelected}
                    onPress={() => setSelectedCategory(chipKey)}
                    style={[
                      styles.chip,
                      styles.customChip,
                      isSelected && selectedStyle,
                    ]}
                    textStyle={isSelected ? styles.chipTextSelected : {}}
                  >
                    {custom.label}
                    {recordType === 'earn' && custom.multiplier > 1 && ` (${custom.multiplier}배)`}
                  </Chip>
                </Pressable>
              );
            })}

            {/* + 추가 Chip */}
            <Chip
              icon="plus"
              onPress={() => setShowAddDialog(true)}
              style={[styles.chip, styles.addChip]}
              textStyle={styles.addChipText}
            >
              추가
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {/* 선택된 활동 설명 */}
      {selectedCategory && selectedActivity && (
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.infoText}>
              {selectedActivity.description || selectedActivity.label}
            </Text>
            {recordType === 'earn' && selectedActivity.requiresApproval && (
              <Text variant="bodySmall" style={styles.approvalText}>
                {selectedActivity.approverType === 'mom' ? '엄마' : '아빠'} 승인 필요
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* 시간 입력 */}
      {recordType !== 'neutral' && !hasFixedHours && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              시간대 입력
            </Text>
            <Text variant="bodySmall" style={styles.timeHint}>
              시작/종료 시간을 입력하면 자동으로 계산됩니다
            </Text>
            <View style={styles.timeRow}>
              <TextInput
                mode="outlined"
                label="시작 시간"
                value={startTime}
                onChangeText={handleStartTimeChange}
                placeholder="14:00"
                style={styles.timeInput}
                error={!!startTimeError}
              />
              <Text style={styles.timeSeparator}>~</Text>
              <TextInput
                mode="outlined"
                label="종료 시간"
                value={endTime}
                onChangeText={handleEndTimeChange}
                placeholder="16:00"
                style={styles.timeInput}
                error={!!endTimeError}
              />
            </View>
            {(startTimeError || endTimeError) && (
              <Text style={styles.timeError}>
                {startTimeError || endTimeError}
              </Text>
            )}
            <View style={styles.durationRow}>
              <TextInput
                mode="outlined"
                label={isAutoCalculated ? "자동 계산됨" : "시간 직접 입력"}
                value={duration}
                onChangeText={(text) => {
                  setDuration(text);
                  setIsAutoCalculated(false);
                }}
                keyboardType="decimal-pad"
                right={<TextInput.Affix text="시간" />}
                style={styles.durationInput}
                disabled={isAutoCalculated}
              />
              {isAutoCalculated && (
                <Button
                  mode="text"
                  compact
                  onPress={() => setIsAutoCalculated(false)}
                  style={styles.editButton}
                >
                  수정
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* 메모 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            메모 (선택)
          </Text>
          <TextInput
            mode="outlined"
            label="메모"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* 예상 결과 */}
      {recordType === 'earn' && selectedCategory && (
        <Card style={styles.resultCard}>
          <Card.Content>
            <Text variant="titleMedium">예상 시간</Text>
            <Text variant="headlineMedium" style={styles.resultValue}>
              +{calculateEarnedTime().toFixed(1)} 시간
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* 저장 버튼 */}
      <Button
        mode="contained"
        onPress={handleSubmit}
        style={[
          styles.submitButton,
          { backgroundColor: recordType === 'earn' ? '#5D7B3A' : recordType === 'spend' ? '#C49A6C' : '#6B4226' }
        ]}
        contentStyle={styles.submitButtonContent}
        labelStyle={styles.submitButtonLabel}
      >
        기록 저장
      </Button>

      {/* 확인 다이얼로그 */}
      <Portal>
        <Dialog visible={showConfirm} onDismiss={() => setShowConfirm(false)}>
          <Dialog.Title>기록 확인</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {getSelectedActivity()?.label}
              {recordType === 'earn' && ` (+${calculateEarnedTime().toFixed(1)}시간)`}
              {recordType === 'spend' && ` (-${parseFloat(duration || '0').toFixed(1)}시간)`}
            </Text>
            {description && <Text variant="bodySmall" style={{ marginTop: 8 }}>메모: {description}</Text>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirm(false)}>취소</Button>
            <Button onPress={confirmSubmit}>확인</Button>
          </Dialog.Actions>
        </Dialog>

        {/* 커스텀 활동 추가 다이얼로그 */}
        <Dialog visible={showAddDialog} onDismiss={resetAddDialog}>
          <Dialog.Title>활동 추가</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="활동 이름"
              value={newLabel}
              onChangeText={setNewLabel}
              style={{ marginBottom: 12 }}
            />
            {recordType === 'earn' && (
              <>
                <Text variant="bodyMedium" style={{ marginBottom: 8 }}>배수 선택</Text>
                <RadioButton.Group onValueChange={setNewMultiplier} value={newMultiplier}>
                  <View style={styles.radioRow}>
                    <RadioButton.Item label="1배" value="1" style={styles.radioItem} />
                    <RadioButton.Item label="1.5배" value="1.5" style={styles.radioItem} />
                    <RadioButton.Item label="2배" value="2" style={styles.radioItem} />
                  </View>
                </RadioButton.Group>

                <View style={styles.approvalRow}>
                  <Text variant="bodyMedium">승인 필요</Text>
                  <Button
                    mode={newRequiresApproval ? 'contained' : 'outlined'}
                    compact
                    onPress={() => setNewRequiresApproval(!newRequiresApproval)}
                    style={{ marginLeft: 8 }}
                  >
                    {newRequiresApproval ? '필요' : '불필요'}
                  </Button>
                </View>

                {newRequiresApproval && (
                  <RadioButton.Group
                    onValueChange={(v) => setNewApproverType(v as ApproverType)}
                    value={newApproverType || 'mom'}
                  >
                    <View style={styles.radioRow}>
                      <RadioButton.Item label="엄마" value="mom" style={styles.radioItem} />
                      <RadioButton.Item label="아빠" value="dad" style={styles.radioItem} />
                    </View>
                  </RadioButton.Group>
                )}
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={resetAddDialog}>취소</Button>
            <Button onPress={handleAddCustomActivity}>추가</Button>
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
  segmentedButtons: {
    margin: 16,
  },
  earnButton: {
    backgroundColor: '#E8F0E0',
  },
  spendButton: {
    backgroundColor: '#F5ECD7',
  },
  neutralButton: {
    backgroundColor: '#EFEBE9',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#EFEBE9',
  },
  infoText: {
    color: '#8D6E63',
  },
  approvalText: {
    color: '#6B4226',
    marginTop: 4,
    fontWeight: '500',
  },
  sectionTitle: {
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  customChip: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#BCAAA4',
  },
  chipSelected: {
    backgroundColor: '#5D7B3A',
  },
  chipSelectedSpend: {
    backgroundColor: '#C49A6C',
  },
  chipSelectedNeutral: {
    backgroundColor: '#6B4226',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  addChip: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#A1887F',
    backgroundColor: 'transparent',
  },
  addChipText: {
    color: '#8D6E63',
  },
  input: {
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    flex: 1,
  },
  timeSeparator: {
    marginHorizontal: 12,
    fontSize: 20,
    color: '#8D6E63',
  },
  timeHint: {
    color: '#A1887F',
    marginBottom: 12,
  },
  timeError: {
    color: '#8B3A3A',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  durationInput: {
    flex: 1,
  },
  editButton: {
    marginLeft: 8,
  },
  resultCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#E8F0E0',
  },
  resultValue: {
    color: '#4A6B2E',
    fontWeight: 'bold',
    marginTop: 8,
  },
  submitButton: {
    margin: 16,
    borderRadius: 12,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  radioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  radioItem: {
    paddingHorizontal: 0,
  },
  approvalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
});
