import { supabase } from '@/lib/supabase';
import { User, UserRole, SignupFormData, ChildInfo } from '@/types';
import { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { upsertProfile } from './connectionService';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  needsVerification?: boolean;
}

// Supabase User를 앱 User 타입으로 변환
function mapSupabaseUser(supabaseUser: SupabaseUser): User {
  const metadata = supabaseUser.user_metadata || {};
  return {
    id: supabaseUser.id,
    name: metadata.name || supabaseUser.email?.split('@')[0] || 'User',
    email: supabaseUser.email || '',
    role: (metadata.role as UserRole) || 'child',
    emailVerified: !!supabaseUser.email_confirmed_at,
    avatar: metadata.avatar as string | undefined,
    parentId: metadata.parentId,
    children: (metadata.children as ChildInfo[]) || [],
    balance: metadata.balance || 0,
    totalEarned: metadata.totalEarned || 0,
    totalSpent: metadata.totalSpent || 0,
    createdAt: new Date(supabaseUser.created_at),
  };
}

// 회원가입
export async function signUp(formData: SignupFormData): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          name: formData.name,
          role: formData.role,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: '회원가입에 실패했습니다.' };
    }

    // profiles 테이블에 프로필 저장 (이메일 조회용)
    await upsertProfile({
      id: data.user.id,
      email: formData.email,
      name: formData.name,
      role: formData.role,
    });

    // 이메일 확인이 필요한 경우 (세션이 없으면 이메일 확인 대기 상태)
    if (!data.session) {
      return {
        success: true,
        user: mapSupabaseUser(data.user),
        needsVerification: true,
      };
    }

    return {
      success: true,
      user: mapSupabaseUser(data.user),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

// 로그인
export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: '로그인에 실패했습니다.' };
    }

    // 로그인 시 profiles 테이블에 프로필 보장 (회원가입 시 이메일 인증 전이라 실패했을 수 있음)
    const metadata = data.user.user_metadata || {};
    await upsertProfile({
      id: data.user.id,
      email: data.user.email || email,
      name: metadata.name || data.user.email?.split('@')[0] || 'User',
      role: metadata.role || 'child',
    });

    return {
      success: true,
      user: mapSupabaseUser(data.user),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

// 로그아웃
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

// 현재 세션 가져오기
export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// 현재 사용자 가져오기
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return mapSupabaseUser(data.user);
}

// 사용자 메타데이터 업데이트 (잔액 등)
export async function updateUserMetadata(
  updates: Partial<Pick<User, 'name' | 'balance' | 'totalEarned' | 'totalSpent' | 'parentId' | 'children'>>
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: '사용자 정보 업데이트에 실패했습니다.' };
    }

    return {
      success: true,
      user: mapSupabaseUser(data.user),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

// 사용자 이름 변경 (auth 메타데이터 + profiles 테이블)
export async function updateUserName(name: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: { name },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: '이름 변경에 실패했습니다.' };
    }

    // profiles 테이블도 업데이트
    await supabase
      .from('profiles')
      .update({ name })
      .eq('id', data.user.id);

    return {
      success: true,
      user: mapSupabaseUser(data.user),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '이름 변경에 실패했습니다.',
    };
  }
}

// 아바타 변경
export async function updateAvatar(avatar: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: { avatar },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: '아바타 변경에 실패했습니다.' };
    }

    return {
      success: true,
      user: mapSupabaseUser(data.user),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '아바타 변경에 실패했습니다.',
    };
  }
}

// 비밀번호 재설정 이메일 전송
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '비밀번호 재설정 이메일 전송에 실패했습니다.',
    };
  }
}

// 인증 메일 재전송
export async function resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '인증 메일 재전송에 실패했습니다.',
    };
  }
}

// 이메일 인증 상태 확인
export async function checkEmailVerification(): Promise<{ verified: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return { verified: false, error: error.message };
    }

    if (!data.user) {
      return { verified: false, error: '사용자 정보를 찾을 수 없습니다.' };
    }

    return { verified: !!data.user.email_confirmed_at };
  } catch (err) {
    return {
      verified: false,
      error: err instanceof Error ? err.message : '인증 상태 확인에 실패했습니다.',
    };
  }
}

// 인증 상태 변경 구독
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, user: User | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      const user = session?.user ? mapSupabaseUser(session.user) : null;
      callback(event, user);
    }
  );

  return () => subscription.unsubscribe();
}
