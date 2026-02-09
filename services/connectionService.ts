import { supabase } from '@/lib/supabase';
import { ChildInfo } from '@/types';

interface Profile {
  id: string;
  email: string;
  name: string;
  role: 'parent' | 'child';
}

// 프로필 등록 (회원가입 시 호출)
export async function upsertProfile(profile: Profile): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
      });

    if (error) {
      console.error('Failed to upsert profile:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '프로필 저장에 실패했습니다.' };
  }
}

// 이메일로 프로필 조회
export async function lookupByEmail(email: string): Promise<{ success: boolean; profile?: Profile; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: '해당 이메일로 가입된 계정을 찾을 수 없습니다.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, profile: data as Profile };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '프로필 조회에 실패했습니다.' };
  }
}

// 부모-자녀 링크 생성
export async function linkParentChild(
  parentId: string,
  childId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('parent_child_links')
      .upsert(
        { parent_id: parentId, child_id: childId },
        { onConflict: 'parent_id,child_id' }
      );

    if (error) {
      console.error('Failed to link parent-child:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '연결에 실패했습니다.' };
  }
}

// 내 자녀 목록 조회 (부모용)
export async function getMyChildren(parentId: string): Promise<{ success: boolean; children?: ChildInfo[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('parent_child_links')
      .select('child_id, profiles!parent_child_links_child_id_fkey(id, email, name)')
      .eq('parent_id', parentId);

    if (error) {
      console.error('Failed to get children:', error);
      return { success: false, error: error.message };
    }

    const children: ChildInfo[] = (data || []).map((row: Record<string, unknown>) => {
      const profile = row.profiles as Record<string, string>;
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
      };
    });

    return { success: true, children };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '자녀 목록 조회에 실패했습니다.' };
  }
}

// 내 부모 ID 조회 (자녀용)
export async function getMyParentId(childId: string): Promise<{ success: boolean; parentId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('parent_child_links')
      .select('parent_id')
      .eq('child_id', childId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to get parent:', error);
      return { success: false, error: error.message };
    }

    return { success: true, parentId: data?.parent_id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '부모 조회에 실패했습니다.' };
  }
}
