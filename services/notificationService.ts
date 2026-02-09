import { supabase } from '@/lib/supabase';
import { AppNotification, NotificationType } from '@/types';

// DB row를 AppNotification 타입으로 변환
function mapDbToNotification(row: any): AppNotification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    type: row.type,
    activityId: row.activity_id,
    title: row.title,
    body: row.body,
    isRead: row.is_read,
    createdAt: new Date(row.created_at),
  };
}

// 알림 생성
export async function createNotification(params: {
  recipientId: string;
  senderId: string;
  senderName?: string;
  type: NotificationType;
  activityId?: string;
  title: string;
  body: string;
}): Promise<{ success: boolean; notification?: AppNotification; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: params.recipientId,
        sender_id: params.senderId,
        sender_name: params.senderName || null,
        type: params.type,
        activity_id: params.activityId || null,
        title: params.title,
        body: params.body,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true, notification: mapDbToNotification(data) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '알림 생성에 실패했습니다.' };
  }
}

// 내 알림 목록 조회
export async function getMyNotifications(
  userId: string,
  limit: number = 50
): Promise<{ success: boolean; notifications?: AppNotification[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get notifications:', error);
      return { success: false, error: error.message };
    }

    return { success: true, notifications: data.map(mapDbToNotification) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '알림 조회에 실패했습니다.' };
  }
}

// 안 읽은 알림 수 조회
export async function getUnreadCount(
  userId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Failed to get unread count:', error);
      return { success: false, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '안 읽은 알림 수 조회에 실패했습니다.' };
  }
}

// 알림 읽음 처리
export async function markAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Failed to mark notification as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '알림 읽음 처리에 실패했습니다.' };
  }
}

// 전체 읽음 처리
export async function markAllAsRead(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Failed to mark all as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '전체 읽음 처리에 실패했습니다.' };
  }
}

// 실시간 구독
export function subscribeToNotifications(
  userId: string,
  onNew: (notification: AppNotification) => void
): () => void {
  const subscription = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        onNew(mapDbToNotification(payload.new));
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}
