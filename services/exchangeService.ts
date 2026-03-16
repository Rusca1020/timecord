import { supabase } from '@/lib/supabase';
import { Exchange } from '@/types';

function mapDbToExchange(row: any): Exchange {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    hours: Number(row.hours),
    amount: Number(row.amount),
    status: row.status,
    requestedAt: new Date(row.requested_at),
    approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  };
}

// 교환 신청
export async function requestExchange(
  userId: string,
  userName: string,
  hours: number,
  amount: number
): Promise<{ success: boolean; exchange?: Exchange; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('exchanges')
      .insert({
        user_id: userId,
        user_name: userName,
        hours,
        amount,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, exchange: mapDbToExchange(data) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '교환 신청에 실패했습니다.' };
  }
}

// 내 교환 목록
export async function getMyExchanges(userId: string): Promise<{ success: boolean; exchanges?: Exchange[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('exchanges')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, exchanges: data.map(mapDbToExchange) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '교환 조회에 실패했습니다.' };
  }
}

// 자녀들 교환 목록 (부모용)
export async function getChildrenExchanges(childIds: string[]): Promise<{ success: boolean; exchanges?: Exchange[]; error?: string }> {
  try {
    if (childIds.length === 0) return { success: true, exchanges: [] };

    const { data, error } = await supabase
      .from('exchanges')
      .select('*')
      .in('user_id', childIds)
      .order('requested_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, exchanges: data.map(mapDbToExchange) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '교환 조회에 실패했습니다.' };
  }
}

// 대기 중 교환 (부모용)
export async function getPendingExchanges(childIds: string[]): Promise<{ success: boolean; exchanges?: Exchange[]; error?: string }> {
  try {
    if (childIds.length === 0) return { success: true, exchanges: [] };

    const { data, error } = await supabase
      .from('exchanges')
      .select('*')
      .in('user_id', childIds)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, exchanges: data.map(mapDbToExchange) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '교환 조회에 실패했습니다.' };
  }
}

// 교환 승인
export async function approveExchange(exchangeId: string, approverId: string): Promise<{ success: boolean; exchange?: Exchange; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('exchanges')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: approverId,
      })
      .eq('id', exchangeId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, exchange: mapDbToExchange(data) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '교환 승인에 실패했습니다.' };
  }
}

// 교환 거절
export async function rejectExchange(exchangeId: string): Promise<{ success: boolean; exchange?: Exchange; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('exchanges')
      .update({ status: 'rejected' })
      .eq('id', exchangeId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, exchange: mapDbToExchange(data) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '교환 거절에 실패했습니다.' };
  }
}

// 교환 완료
export async function completeExchange(exchangeId: string): Promise<{ success: boolean; exchange?: Exchange; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('exchanges')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', exchangeId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, exchange: mapDbToExchange(data) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '교환 완료 처리에 실패했습니다.' };
  }
}

// 실시간 구독 (자녀용)
export function subscribeToExchanges(
  userId: string,
  callback: (exchanges: Exchange[]) => void
): () => void {
  const subscription = supabase
    .channel(`exchanges-child-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'exchanges',
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        const result = await getMyExchanges(userId);
        if (result.success && result.exchanges) {
          callback(result.exchanges);
        }
      }
    )
    .subscribe();

  return () => { subscription.unsubscribe(); };
}

// 실시간 구독 (부모용 - 자녀들)
export function subscribeToChildrenExchanges(
  childIds: string[],
  callback: (exchanges: Exchange[]) => void
): () => void {
  if (childIds.length === 0) return () => {};

  const channels = childIds.map(childId =>
    supabase
      .channel(`exchanges-parent-${childId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exchanges',
          filter: `user_id=eq.${childId}`,
        },
        async () => {
          const result = await getChildrenExchanges(childIds);
          if (result.success && result.exchanges) {
            callback(result.exchanges);
          }
        }
      )
      .subscribe()
  );

  return () => { channels.forEach(ch => ch.unsubscribe()); };
}
