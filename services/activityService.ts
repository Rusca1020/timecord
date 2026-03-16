import { supabase } from '@/lib/supabase';
import { Activity } from '@/types';

// DB row를 Activity 타입으로 변환
function mapDbToActivity(row: any): Activity {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    date: row.date,
    type: row.type,
    category: row.category,
    duration: Number(row.duration),
    multiplier: Number(row.multiplier),
    earnedTime: Number(row.earned_time),
    startTime: row.start_time,
    endTime: row.end_time,
    description: row.description,
    requiresApproval: row.requires_approval,
    approverType: row.approver_type,
    approved: row.approved,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

// Activity를 DB row로 변환
function mapActivityToDb(activity: Omit<Activity, 'id' | 'createdAt'> & { id?: string }) {
  const row: Record<string, unknown> = {
    user_id: activity.userId,
    user_name: activity.userName || null,
    date: activity.date,
    type: activity.type,
    category: activity.category,
    duration: activity.duration,
    multiplier: activity.multiplier,
    earned_time: activity.earnedTime,
    start_time: activity.startTime || null,
    end_time: activity.endTime || null,
    description: activity.description || null,
    requires_approval: activity.requiresApproval ?? false,
    approver_type: activity.approverType ?? null,
    approved: activity.approved ?? true,
  };

  if (activity.id) row.id = activity.id;
  if (activity.approvedBy) row.approved_by = activity.approvedBy;
  if (activity.approvedAt) row.approved_at = activity.approvedAt instanceof Date ? activity.approvedAt.toISOString() : activity.approvedAt;

  return row;
}

// 활동 추가
export async function addActivity(activity: Omit<Activity, 'id' | 'createdAt'>): Promise<{ success: boolean; activity?: Activity; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('activities')
      .insert(mapActivityToDb(activity))
      .select()
      .single();

    if (error) {
      console.error('Failed to add activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true, activity: mapDbToActivity(data) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '활동 추가에 실패했습니다.' };
  }
}

// 내 활동 조회
export async function getMyActivities(): Promise<{ success: boolean; activities?: Activity[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get activities:', error);
      return { success: false, error: error.message };
    }

    return { success: true, activities: data.map(mapDbToActivity) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '활동 조회에 실패했습니다.' };
  }
}

// 자녀 활동 조회 (부모용)
export async function getChildrenActivities(childIds: string[]): Promise<{ success: boolean; activities?: Activity[]; error?: string }> {
  try {
    if (childIds.length === 0) {
      return { success: true, activities: [] };
    }

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .in('user_id', childIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get children activities:', error);
      return { success: false, error: error.message };
    }

    return { success: true, activities: data.map(mapDbToActivity) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '자녀 활동 조회에 실패했습니다.' };
  }
}

// 승인 대기 활동 조회 (부모용)
export async function getPendingActivities(childIds: string[]): Promise<{ success: boolean; activities?: Activity[]; error?: string }> {
  try {
    if (childIds.length === 0) {
      return { success: true, activities: [] };
    }

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .in('user_id', childIds)
      .eq('approved', false)
      .eq('requires_approval', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get pending activities:', error);
      return { success: false, error: error.message };
    }

    return { success: true, activities: data.map(mapDbToActivity) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '승인 대기 활동 조회에 실패했습니다.' };
  }
}

// 활동 승인
export async function approveActivity(activityId: string, approverId: string): Promise<{ success: boolean; activity?: Activity; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('activities')
      .update({
        approved: true,
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', activityId)
      .select()
      .single();

    if (error) {
      console.error('Failed to approve activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true, activity: mapDbToActivity(data) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '활동 승인에 실패했습니다.' };
  }
}

// 활동 삭제 (거절)
export async function deleteActivity(activityId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);

    if (error) {
      console.error('Failed to delete activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '활동 삭제에 실패했습니다.' };
  }
}

// 활동 업데이트
export async function updateActivity(activityId: string, updates: Partial<Activity>): Promise<{ success: boolean; activity?: Activity; error?: string }> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.approved !== undefined) dbUpdates.approved = updates.approved;
    if (updates.approvedBy !== undefined) dbUpdates.approved_by = updates.approvedBy;
    if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt instanceof Date ? updates.approvedAt.toISOString() : updates.approvedAt;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.multiplier !== undefined) dbUpdates.multiplier = updates.multiplier;
    if (updates.earnedTime !== undefined) dbUpdates.earned_time = updates.earnedTime;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.category !== undefined) dbUpdates.category = updates.category;

    const { data, error } = await supabase
      .from('activities')
      .update(dbUpdates)
      .eq('id', activityId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true, activity: mapDbToActivity(data) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '활동 업데이트에 실패했습니다.' };
  }
}

// 실시간 구독 설정
export function subscribeToActivities(
  userId: string,
  callback: (activities: Activity[]) => void
): () => void {
  const subscription = supabase
    .channel('activities-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'activities',
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        // 변경이 있으면 전체 데이터 다시 조회
        const result = await getMyActivities();
        if (result.success && result.activities) {
          callback(result.activities);
        }
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

// 실시간 구독 (부모용 - 자녀들)
export function subscribeToChildrenActivities(
  childIds: string[],
  callback: (activities: Activity[]) => void
): () => void {
  if (childIds.length === 0) return () => {};

  const channels = childIds.map(childId =>
    supabase
      .channel(`activities-parent-${childId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities',
          filter: `user_id=eq.${childId}`,
        },
        async () => {
          const result = await getChildrenActivities(childIds);
          if (result.success && result.activities) {
            callback(result.activities);
          }
        }
      )
      .subscribe()
  );

  return () => { channels.forEach(ch => ch.unsubscribe()); };
}
