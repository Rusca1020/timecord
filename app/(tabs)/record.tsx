import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Card, Text, Button, TextInput, SegmentedButtons, Chip, Portal, Dialog } from 'react-native-paper';
import { useStore } from '@/store/useStore';
import { EARN_ACTIVITIES, SPEND_ACTIVITIES, NEUTRAL_ACTIVITIES } from '@/constants/activities';
import { EarnCategory, SpendCategory, NeutralCategory, Activity } from '@/types';

type RecordType = 'earn' | 'spend' | 'neutral';

export default function RecordScreen() {
  const [recordType, setRecordType] = useState<RecordType>('earn');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [duration, setDuration] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const addActivity = useStore((state) => state.addActivity);
  const updateBalance = useStore((state) => state.updateBalance);

  const earnCategories = Object.entries(EARN_ACTIVITIES);
  const spendCategories = Object.entries(SPEND_ACTIVITIES);
  const neutralCategories = Object.entries(NEUTRAL_ACTIVITIES);

  const getSelectedActivity = () => {
    if (!selectedCategory) return null;
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
    const activity = EARN_ACTIVITIES[selectedCategory as EarnCategory];
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
    if (recordType !== 'neutral' && !duration && !getSelectedActivity()?.fixedHours) {
      Alert.alert('알림', '시간을 입력해주세요.');
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = () => {
    const activity = getSelectedActivity();
    if (!activity) return;

    const now = new Date();
    const earnedTime = recordType === 'earn' ? calculateEarnedTime() : parseFloat(duration || '0');

    const newActivity: Activity = {
      id: Date.now().toString(),
      userId: 'demo-user',
      date: now.toISOString().split('T')[0],
      type: recordType,
      category: selectedCategory as EarnCategory | SpendCategory | NeutralCategory,
      duration: parseFloat(duration || '0'),
      multiplier: recordType === 'earn' ? (EARN_ACTIVITIES[selectedCategory as EarnCategory]?.multiplier || 1) : 1,
      earnedTime: earnedTime,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      description: description || undefined,
      requiresApproval: recordType === 'earn' && EARN_ACTIVITIES[selectedCategory as EarnCategory]?.requiresApproval,
      approverType: recordType === 'earn' ? EARN_ACTIVITIES[selectedCategory as EarnCategory]?.approverType : null,
      approved: recordType === 'earn' ? !EARN_ACTIVITIES[selectedCategory as EarnCategory]?.requiresApproval : true,
      createdAt: now,
    };

    addActivity(newActivity);

    // 잔액 업데이트 (승인이 필요 없는 경우만)
    if (newActivity.approved) {
      if (recordType === 'earn') {
        updateBalance(earnedTime);
      } else if (recordType === 'spend') {
        updateBalance(-parseFloat(duration || '0'));
      }
    }

    setShowConfirm(false);
    resetForm();
    Alert.alert(
      '완료',
      newActivity.requiresApproval
        ? '기록이 저장되었습니다. 부모님 승인 후 시간이 반영됩니다.'
        : '기록이 저장되었습니다!'
    );
  };

  const resetForm = () => {
    setSelectedCategory(null);
    setDuration('');
    setStartTime('');
    setEndTime('');
    setDescription('');
  };

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
          </View>
        </Card.Content>
      </Card>

      {/* 선택된 활동 설명 */}
      {selectedCategory && getSelectedActivity() && (
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.infoText}>
              {getSelectedActivity()?.description}
            </Text>
            {recordType === 'earn' && EARN_ACTIVITIES[selectedCategory as EarnCategory]?.requiresApproval && (
              <Text variant="bodySmall" style={styles.approvalText}>
                {EARN_ACTIVITIES[selectedCategory as EarnCategory]?.approverType === 'mom' ? '엄마' : '아빠'} 승인 필요
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* 시간 입력 */}
      {recordType !== 'neutral' && !getSelectedActivity()?.fixedHours && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              시간 입력
            </Text>
            <TextInput
              mode="outlined"
              label="시간 (예: 1.5)"
              value={duration}
              onChangeText={setDuration}
              keyboardType="decimal-pad"
              right={<TextInput.Affix text="시간" />}
              style={styles.input}
            />
            <View style={styles.timeRow}>
              <TextInput
                mode="outlined"
                label="시작 시간"
                value={startTime}
                onChangeText={setStartTime}
                placeholder="15:00"
                style={styles.timeInput}
              />
              <Text style={styles.timeSeparator}>~</Text>
              <TextInput
                mode="outlined"
                label="종료 시간"
                value={endTime}
                onChangeText={setEndTime}
                placeholder="18:00"
                style={styles.timeInput}
              />
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
          { backgroundColor: recordType === 'earn' ? '#10B981' : recordType === 'spend' ? '#F59E0B' : '#6366F1' }
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
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  segmentedButtons: {
    margin: 16,
  },
  earnButton: {
    backgroundColor: '#ECFDF5',
  },
  spendButton: {
    backgroundColor: '#FEF3C7',
  },
  neutralButton: {
    backgroundColor: '#EEF2FF',
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
    backgroundColor: '#F1F5F9',
  },
  infoText: {
    color: '#64748B',
  },
  approvalText: {
    color: '#6366F1',
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
  chipSelected: {
    backgroundColor: '#10B981',
  },
  chipSelectedSpend: {
    backgroundColor: '#F59E0B',
  },
  chipSelectedNeutral: {
    backgroundColor: '#6366F1',
  },
  chipTextSelected: {
    color: '#FFFFFF',
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
    color: '#64748B',
  },
  resultCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
  },
  resultValue: {
    color: '#059669',
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
});
