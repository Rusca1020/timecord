import { supabase } from '@/lib/supabase';
import { CustomActivity, ApproverType } from '@/types';

interface DbCustomActivity {
  id: string;
  user_id: string;
  type: 'earn' | 'spend' | 'neutral';
  label: string;
  multiplier: number;
  requires_approval: boolean;
  approver_type: string | null;
  description: string;
  created_at: string;
}

function mapDbToCustomActivity(db: DbCustomActivity): CustomActivity {
  return {
    id: db.id,
    userId: db.user_id,
    type: db.type,
    label: db.label,
    multiplier: db.multiplier,
    requiresApproval: db.requires_approval,
    approverType: (db.approver_type as ApproverType) || null,
    description: db.description || '',
    createdAt: new Date(db.created_at),
  };
}

export async function getCustomActivities(
  userId: string
): Promise<{ success: boolean; activities?: CustomActivity[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('custom_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load custom activities:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      activities: (data || []).map(mapDbToCustomActivity),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '커스텀 활동을 불러오지 못했습니다.',
    };
  }
}

export async function addCustomActivity(activity: {
  userId: string;
  type: 'earn' | 'spend' | 'neutral';
  label: string;
  multiplier?: number;
  requiresApproval?: boolean;
  approverType?: ApproverType;
  description?: string;
}): Promise<{ success: boolean; activity?: CustomActivity; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('custom_activities')
      .insert({
        user_id: activity.userId,
        type: activity.type,
        label: activity.label,
        multiplier: activity.multiplier ?? 1,
        requires_approval: activity.requiresApproval ?? false,
        approver_type: activity.approverType ?? null,
        description: activity.description ?? '',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to add custom activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true, activity: mapDbToCustomActivity(data) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '커스텀 활동 추가에 실패했습니다.',
    };
  }
}

export async function deleteCustomActivity(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('custom_activities')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete custom activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '커스텀 활동 삭제에 실패했습니다.',
    };
  }
}
