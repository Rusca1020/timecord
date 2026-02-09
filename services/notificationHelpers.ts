import { supabase } from '@/lib/supabase';
import { Activity, User } from '@/types';
import * as notificationService from './notificationService';
import * as pushService from './pushService';

// 카테고리 한글 이름
const categoryNames: Record<string, string> = {
  holiday_base: '휴일 기본',
  academy_study: '학원/과외 공부',
  academy_homework: '학원/과외 숙제',
  self_study: '스스로 공부',
  reading: '독서 + 독후감',
  good_deed: '좋은 일',
  coding: '코딩/AI',
  app_complete: '앱 완성',
  app_store: '앱스토어 등록',
};

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

    const categoryLabel = categoryNames[activity.category] || activity.category;
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
    const categoryLabel = categoryNames[activity.category] || activity.category;
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
