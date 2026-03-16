import { supabase } from '@/lib/supabase';
import { Activity, Exchange, User } from '@/types';
import * as notificationService from './notificationService';
import * as pushService from './pushService';
import { getCategoryLabel } from '@/constants/categoryNames';

// 자녀가 승인 필요 활동 제출 → 부모에게 알림
export async function notifyParentsOfNewActivity(
  child: User,
  activity: Activity
): Promise<void> {
  try {
    // parent_child_links에서 부모 ID 조회
    const { data: links } = await supabase
      .from('parent_child_links')
      .select('parent_id')
      .eq('child_id', child.id);

    if (!links || links.length === 0) return;

    const categoryLabel = getCategoryLabel(activity.category);
    const title = '승인 요청';
    const body = `${child.name}님이 "${categoryLabel}" 활동 (${activity.earnedTime}시간) 승인을 요청했습니다.`;

    for (const link of links) {
      // 인앱 알림
      await notificationService.createNotification({
        recipientId: link.parent_id,
        senderId: child.id,
        senderName: child.name,
        type: 'approval_request',
        activityId: activity.id,
        title,
        body,
      });

      // 푸시 알림
      await pushService.sendPushToUser(link.parent_id, title, body, {
        type: 'approval_request',
        activityId: activity.id,
      });
    }
  } catch (err) {
    console.error('Failed to notify parents:', err);
  }
}

// 부모가 승인/거절 → 자녀에게 알림
export async function notifyChildOfDecision(
  parent: User,
  activity: Activity,
  decision: 'approved' | 'rejected'
): Promise<void> {
  try {
    const categoryLabel = getCategoryLabel(activity.category);
    const title = decision === 'approved' ? '활동 승인됨' : '활동 거절됨';
    const body = decision === 'approved'
      ? `"${categoryLabel}" 활동이 승인되었습니다. +${activity.earnedTime}시간`
      : `"${categoryLabel}" 활동이 거절되었습니다.`;

    // 인앱 알림
    await notificationService.createNotification({
      recipientId: activity.userId,
      senderId: parent.id,
      senderName: parent.name,
      type: decision,
      activityId: decision === 'approved' ? activity.id : undefined,
      title,
      body,
    });

    // 푸시 알림
    await pushService.sendPushToUser(activity.userId, title, body, {
      type: decision,
      activityId: activity.id,
    });
  } catch (err) {
    console.error('Failed to notify child:', err);
  }
}

// 부모가 자녀에게 벌금 부여 → 자녀에게 알림
export async function notifyChildOfPenalty(
  parent: User,
  childId: string,
  categoryLabel: string,
  hours: number
): Promise<void> {
  try {
    const title = '벌금 부여';
    const body = `${parent.name}님이 "${categoryLabel}" 벌금을 부여했습니다. -${hours}시간`;

    await notificationService.createNotification({
      recipientId: childId,
      senderId: parent.id,
      senderName: parent.name,
      type: 'penalty',
      title,
      body,
    });
    await pushService.sendPushToUser(childId, title, body, {
      type: 'penalty',
    });
  } catch (err) {
    console.error('Failed to notify child of penalty:', err);
  }
}

// 자녀가 교환 신청 → 부모에게 알림
export async function notifyParentsOfExchange(
  child: User,
  exchange: Exchange
): Promise<void> {
  try {
    const { data: links } = await supabase
      .from('parent_child_links')
      .select('parent_id')
      .eq('child_id', child.id);

    if (!links || links.length === 0) return;

    const title = '교환 신청';
    const body = `${child.name}님이 ${exchange.hours}시간 → ${exchange.amount.toLocaleString()}원 교환을 신청했습니다.`;

    for (const link of links) {
      await notificationService.createNotification({
        recipientId: link.parent_id,
        senderId: child.id,
        senderName: child.name,
        type: 'exchange_request',
        title,
        body,
      });
      await pushService.sendPushToUser(link.parent_id, title, body, {
        type: 'exchange_request',
      });
    }
  } catch (err) {
    console.error('Failed to notify parents of exchange:', err);
  }
}

// 부모가 교환 승인/거절 → 자녀에게 알림
export async function notifyChildOfExchangeDecision(
  parent: User,
  exchange: Exchange,
  decision: 'exchange_approved' | 'exchange_rejected'
): Promise<void> {
  try {
    const title = decision === 'exchange_approved' ? '교환 승인됨' : '교환 거절됨';
    const body = decision === 'exchange_approved'
      ? `${exchange.hours}시간 → ${exchange.amount.toLocaleString()}원 교환이 승인되었습니다.`
      : `${exchange.hours}시간 → ${exchange.amount.toLocaleString()}원 교환이 거절되었습니다.`;

    await notificationService.createNotification({
      recipientId: exchange.userId,
      senderId: parent.id,
      senderName: parent.name,
      type: decision,
      title,
      body,
    });
    await pushService.sendPushToUser(exchange.userId, title, body, {
      type: decision,
    });
  } catch (err) {
    console.error('Failed to notify child of exchange decision:', err);
  }
}
