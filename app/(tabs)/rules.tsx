import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Card, Text, Chip, List, Divider } from 'react-native-paper';
import { EARN_ACTIVITIES, SPEND_ACTIVITIES, PENALTY_ACTIVITIES, NEUTRAL_ACTIVITIES, EXCHANGE_RATE } from '@/constants/activities';
import { EarnCategory, SpendCategory, PenaltyCategory, NeutralCategory } from '@/types';

export default function RulesScreen() {
  return (
    <ScrollView style={styles.container}>
      {/* 교환 비율 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>저금 교환 비율</Text>
          <View style={styles.exchangeInfo}>
            <Text variant="headlineSmall" style={styles.exchangeRate}>
              {EXCHANGE_RATE.hours}시간 = {EXCHANGE_RATE.amount.toLocaleString()}원
            </Text>
            <Text style={styles.exchangeSub}>
              시간당 {EXCHANGE_RATE.perHour.toLocaleString()}원
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* 시간 벌기 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>시간 벌기</Text>
          {(Object.entries(EARN_ACTIVITIES) as [EarnCategory, typeof EARN_ACTIVITIES[EarnCategory]][]).map(([key, info], idx) => (
            <View key={key}>
              {idx > 0 && <Divider style={styles.divider} />}
              <View style={styles.ruleRow}>
                <View style={styles.ruleLeft}>
                  <Text style={styles.ruleLabel}>{info.label}</Text>
                  <Text style={styles.ruleDesc}>{info.description}</Text>
                </View>
                <View style={styles.ruleRight}>
                  {info.fixedHours ? (
                    <Chip compact style={styles.earnChip} textStyle={styles.earnChipText}>
                      +{info.fixedHours}h
                    </Chip>
                  ) : (
                    <Chip compact style={styles.earnChip} textStyle={styles.earnChipText}>
                      x{info.multiplier}배
                    </Chip>
                  )}
                  {info.requiresApproval && (
                    <Chip compact style={info.approverType === 'mom' ? styles.momChip : styles.dadChip} textStyle={styles.approverText}>
                      {info.approverType === 'mom' ? '엄마 확인' : '아빠 확인'}
                    </Chip>
                  )}
                </View>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* 시간 쓰기 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>시간 쓰기</Text>
          {(Object.entries(SPEND_ACTIVITIES) as [SpendCategory, typeof SPEND_ACTIVITIES[SpendCategory]][]).map(([key, info], idx) => (
            <View key={key}>
              {idx > 0 && <Divider style={styles.divider} />}
              <View style={styles.ruleRow}>
                <View style={styles.ruleLeft}>
                  <Text style={styles.ruleLabel}>{info.label}</Text>
                  <Text style={styles.ruleDesc}>{info.description}</Text>
                </View>
                <Chip compact style={styles.spendChip} textStyle={styles.spendChipText}>1:1 차감</Chip>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* 벌금 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>벌금</Text>
          {(Object.entries(PENALTY_ACTIVITIES) as [PenaltyCategory, typeof PENALTY_ACTIVITIES[PenaltyCategory]][]).map(([key, info], idx) => (
            <View key={key}>
              {idx > 0 && <Divider style={styles.divider} />}
              <View style={styles.ruleRow}>
                <View style={styles.ruleLeft}>
                  <Text style={styles.ruleLabel}>{info.label}</Text>
                  <Text style={styles.ruleDesc}>{info.description}</Text>
                </View>
                <Chip compact style={styles.penaltyChip} textStyle={styles.penaltyChipText}>-{info.hours}h</Chip>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* 중립 활동 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>중립 활동</Text>
          <Text style={styles.neutralNote}>시간 벌기/쓰기에 포함되지 않는 활동</Text>
          {(Object.entries(NEUTRAL_ACTIVITIES) as [NeutralCategory, typeof NEUTRAL_ACTIVITIES[NeutralCategory]][]).map(([key, info], idx) => (
            <View key={key}>
              {idx > 0 && <Divider style={styles.divider} />}
              <View style={styles.ruleRow}>
                <View style={styles.ruleLeft}>
                  <Text style={styles.ruleLabel}>{info.label}</Text>
                  <Text style={styles.ruleDesc}>{info.description}</Text>
                </View>
                <Chip compact style={styles.neutralChip} textStyle={styles.neutralChipText}>0h</Chip>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  card: { marginHorizontal: 16, marginTop: 16, borderRadius: 12 },
  sectionTitle: { fontWeight: 'bold', color: '#3E2723', marginBottom: 12 },
  exchangeInfo: { alignItems: 'center', paddingVertical: 8 },
  exchangeRate: { fontWeight: 'bold', color: '#6B4226' },
  exchangeSub: { color: '#A1887F', marginTop: 4 },
  divider: { marginVertical: 8 },
  ruleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  ruleLeft: { flex: 1, marginRight: 12 },
  ruleRight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  ruleLabel: { fontWeight: '600', color: '#4E342E', fontSize: 14 },
  ruleDesc: { color: '#A1887F', fontSize: 12, marginTop: 2 },
  earnChip: { backgroundColor: '#E8F0E0' },
  earnChipText: { color: '#4A6B2E', fontSize: 12, fontWeight: '600' },
  spendChip: { backgroundColor: '#F5ECD7' },
  spendChipText: { color: '#A67B4B', fontSize: 12, fontWeight: '600' },
  penaltyChip: { backgroundColor: '#F0D6D6' },
  penaltyChipText: { color: '#6D2B2B', fontSize: 12, fontWeight: '600' },
  neutralChip: { backgroundColor: '#EFEBE9' },
  neutralChipText: { color: '#8D6E63', fontSize: 12, fontWeight: '600' },
  momChip: { backgroundColor: '#F5E0D0' },
  dadChip: { backgroundColor: '#EFEBE9' },
  approverText: { fontSize: 11 },
  neutralNote: { color: '#A1887F', fontSize: 13, marginBottom: 8 },
});
