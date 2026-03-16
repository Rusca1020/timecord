import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Card, Text, Button, Chip, Surface, Portal, Dialog } from 'react-native-paper';
import { useStore } from '@/store/useStore';

export default function ExchangeScreen() {
  const user = useStore((state) => state.user);
  const exchanges = useStore((state) => state.exchanges);
  const approveExchange = useStore((state) => state.approveExchange);
  const rejectExchange = useStore((state) => state.rejectExchange);
  const completeExchange = useStore((state) => state.completeExchange);

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [completeTargetId, setCompleteTargetId] = useState<string | null>(null);

  const pendingExchanges = exchanges.filter(e => e.status === 'pending');
  const completedExchanges = exchanges.filter(e => e.status !== 'pending');

  const handleApprove = async (id: string) => {
    if (processingIds.has(id)) return;
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await approveExchange(id);
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const confirmReject = async () => {
    if (!rejectTargetId) return;
    const id = rejectTargetId;
    setRejectTargetId(null);
    if (processingIds.has(id)) return;
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await rejectExchange(id);
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const confirmComplete = async () => {
    if (!completeTargetId) return;
    const id = completeTargetId;
    setCompleteTargetId(null);
    if (processingIds.has(id)) return;
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await completeExchange(id);
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4A6B2E';
      case 'rejected': return '#8B3A3A';
      case 'completed': return '#6B4226';
      default: return '#A67B4B';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return '승인됨';
      case 'rejected': return '거절됨';
      case 'completed': return '완료';
      default: return '대기 중';
    }
  };

  const formatDate = (date: Date) => {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const h = date.getHours();
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${m}/${d} ${h}:${min}`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>교환 관리</Text>
        {pendingExchanges.length > 0 && (
          <Chip style={styles.countChip}>{pendingExchanges.length}건 대기</Chip>
        )}
      </View>

      {/* 대기 중 교환 */}
      {pendingExchanges.length === 0 ? (
        <Surface style={styles.emptyContainer}>
          <Text style={styles.emptyText}>대기 중인 교환 신청이 없습니다</Text>
        </Surface>
      ) : (
        pendingExchanges.map((exchange) => (
          <Card key={exchange.id} style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View>
                  <Text variant="titleMedium" style={styles.childName}>
                    {exchange.userName || '알 수 없음'}
                  </Text>
                  <Text variant="bodySmall" style={styles.dateText}>
                    {formatDate(exchange.requestedAt)}
                  </Text>
                </View>
                <Chip compact style={styles.pendingChip}>대기 중</Chip>
              </View>

              <View style={styles.exchangeDetail}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>교환 시간</Text>
                  <Text style={styles.detailValue}>{exchange.hours}시간</Text>
                </View>
                <View style={styles.arrow}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>교환 금액</Text>
                  <Text style={[styles.detailValue, { color: '#4A6B2E' }]}>
                    {exchange.amount.toLocaleString()}원
                  </Text>
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  mode="outlined"
                  onPress={() => setRejectTargetId(exchange.id)}
                  style={styles.rejectButton}
                  textColor="#8B3A3A"
                  disabled={processingIds.has(exchange.id)}
                >
                  거절
                </Button>
                <Button
                  mode="contained"
                  onPress={() => handleApprove(exchange.id)}
                  style={styles.approveButton}
                  buttonColor="#5D7B3A"
                  disabled={processingIds.has(exchange.id)}
                >
                  승인
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))
      )}

      {/* 처리 완료 내역 */}
      {completedExchanges.length > 0 && (
        <>
          <Text variant="titleMedium" style={styles.sectionTitle}>처리 내역</Text>
          {completedExchanges.map((exchange) => (
            <Card key={exchange.id} style={styles.historyCard}>
              <Card.Content style={styles.historyContent}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
                    {exchange.userName || '알 수 없음'}
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#8D6E63' }}>
                    {exchange.hours}시간 → {exchange.amount.toLocaleString()}원
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#A1887F', marginTop: 2 }}>
                    {formatDate(exchange.requestedAt)}
                  </Text>
                </View>
                <View style={styles.historyActions}>
                  {exchange.status === 'approved' && (
                    <Button
                      mode="contained"
                      compact
                      onPress={() => setCompleteTargetId(exchange.id)}
                      buttonColor="#6B4226"
                      labelStyle={{ fontSize: 12 }}
                      style={{ marginRight: 8 }}
                      disabled={processingIds.has(exchange.id)}
                    >
                      완료
                    </Button>
                  )}
                  <Chip
                    compact
                    style={{ backgroundColor: getStatusColor(exchange.status) + '1A' }}
                    textStyle={{ color: getStatusColor(exchange.status), fontSize: 12 }}
                  >
                    {getStatusLabel(exchange.status)}
                  </Chip>
                </View>
              </Card.Content>
            </Card>
          ))}
        </>
      )}

      <View style={{ height: 32 }} />

      {/* 거절 확인 다이얼로그 */}
      <Portal>
        <Dialog visible={rejectTargetId !== null} onDismiss={() => setRejectTargetId(null)}>
          <Dialog.Title>교환 거절</Dialog.Title>
          <Dialog.Content>
            <Text>이 교환 신청을 거절하시겠습니까? 차감된 시간이 복원됩니다.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRejectTargetId(null)}>취소</Button>
            <Button onPress={confirmReject} textColor="#8B3A3A">거절</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 완료 확인 다이얼로그 */}
      <Portal>
        <Dialog visible={completeTargetId !== null} onDismiss={() => setCompleteTargetId(null)}>
          <Dialog.Title>교환 완료</Dialog.Title>
          <Dialog.Content>
            <Text>돈을 지급하셨습니까? 완료 처리하면 되돌릴 수 없습니다.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCompleteTargetId(null)}>취소</Button>
            <Button onPress={confirmComplete}>완료</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontWeight: 'bold', color: '#3E2723' },
  countChip: { backgroundColor: '#F5ECD7' },
  emptyContainer: { margin: 16, padding: 32, borderRadius: 12, alignItems: 'center' },
  emptyText: { color: '#A1887F' },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16,
  },
  childName: { fontWeight: 'bold', color: '#3E2723' },
  dateText: { color: '#A1887F', marginTop: 2 },
  pendingChip: { backgroundColor: '#F5ECD7' },
  exchangeDetail: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, marginBottom: 16,
  },
  detailItem: { alignItems: 'center', flex: 1 },
  detailLabel: { color: '#8D6E63', fontSize: 12, marginBottom: 4 },
  detailValue: { fontWeight: 'bold', fontSize: 18, color: '#3E2723' },
  arrow: { paddingHorizontal: 12 },
  arrowText: { fontSize: 20, color: '#A1887F' },
  buttonContainer: { flexDirection: 'row', gap: 12 },
  rejectButton: { flex: 1, borderColor: '#D4A59A' },
  approveButton: { flex: 1 },
  sectionTitle: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12, fontWeight: 'bold', color: '#8D6E63' },
  historyCard: { marginHorizontal: 16, marginBottom: 8, borderRadius: 12 },
  historyContent: { flexDirection: 'row', alignItems: 'center' },
  historyActions: { flexDirection: 'row', alignItems: 'center' },
});
