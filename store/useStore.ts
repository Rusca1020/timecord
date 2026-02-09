import { create } from 'zustand';
import { User, Activity, AppNotification, SignupFormData } from '@/types';
import * as authService from '@/services/authService';
import * as activityService from '@/services/activityService';
import * as connectionService from '@/services/connectionService';
import * as notificationService from '@/services/notificationService';
import { notifyParentsOfNewActivity, notifyChildOfDecision } from '@/services/notificationHelpers';

interface AppState {
  // 사용자 상태
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;

  // 활동 기록
  activities: Activity[];
  todayActivities: Activity[];

  // 승인 대기 중인 활동 (부모용)
  pendingApprovals: Activity[];

  // 알림
  notifications: AppNotification[];
  unreadNotificationCount: number;

  // 기본 액션
  setUser: (user: User | null) => void;
  setIsLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;

  // 인증 액션
  signUp: (formData: SignupFormData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;

  // 연결 동기화
  syncConnections: () => Promise<void>;

  // 활동 액션 (Supabase 연동)
  loadActivities: () => Promise<void>;
  loadPendingApprovals: () => Promise<void>;
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => Promise<boolean>;
  updateActivity: (id: string, updates: Partial<Activity>) => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
  approveActivity: (id: string) => Promise<void>;
  setActivities: (activities: Activity[]) => void;
  setPendingApprovals: (activities: Activity[]) => void;

  // 잔액 업데이트
  updateBalance: (amount: number) => Promise<void>;

  // 알림 액션
  loadNotifications: () => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addNotification: (notification: AppNotification) => void;

  // 거절 (알림 포함)
  rejectActivity: (id: string) => Promise<void>;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,
  activities: [],
  todayActivities: [],
  pendingApprovals: [],
  notifications: [],
  unreadNotificationCount: 0,
};

export const useStore = create<AppState>()((set, get) => ({
  ...initialState,

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      authError: null,
    });
  },

  setIsLoading: (isLoading) => set({ isLoading }),

  setAuthError: (authError) => set({ authError, isLoading: false }),

  // 회원가입 (Supabase)
  signUp: async (formData: SignupFormData) => {
    set({ isLoading: true, authError: null });

    const result = await authService.signUp(formData);

    if (result.success && result.user) {
      set({ user: result.user, isAuthenticated: true, isLoading: false });
    } else {
      set({ authError: result.error || '회원가입에 실패했습니다.', isLoading: false });
    }
  },

  // 로그인 (Supabase)
  signIn: async (email: string, password: string) => {
    set({ isLoading: true, authError: null });

    const result = await authService.signIn(email, password);

    if (result.success && result.user) {
      set({ user: result.user, isAuthenticated: true, isLoading: false });
      // 로그인 후 연결 동기화 + 활동 데이터 + 알림 로드
      await get().syncConnections();
      await get().loadActivities();
      if (get().user?.role === 'parent') {
        await get().loadPendingApprovals();
      }
      await get().loadNotifications();
      await get().loadUnreadCount();
    } else {
      set({ authError: result.error || '로그인에 실패했습니다.', isLoading: false });
    }
  },

  // 초기화 (세션 복원)
  initializeAuth: async () => {
    set({ isLoading: true });

    const user = await authService.getCurrentUser();

    if (user) {
      set({ user, isAuthenticated: true, isLoading: false });
      // 세션 복원 후 연결 동기화 + 활동 데이터 + 알림 로드
      await get().syncConnections();
      await get().loadActivities();
      if (get().user?.role === 'parent') {
        await get().loadPendingApprovals();
      }
      await get().loadNotifications();
      await get().loadUnreadCount();
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  // 로그아웃
  logout: async () => {
    await authService.signOut();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      authError: null,
      activities: [],
      todayActivities: [],
      pendingApprovals: [],
      notifications: [],
      unreadNotificationCount: 0,
    });
  },

  // 연결 동기화: parent_child_links 테이블에서 최신 연결 상태를 가져와 metadata 동기화
  syncConnections: async () => {
    const { user } = get();
    if (!user) return;

    try {
      if (user.role === 'parent') {
        // 부모: links 테이블에서 자녀 목록 조회 → children metadata 동기화
        const result = await connectionService.getMyChildren(user.id);
        if (result.success && result.children) {
          const currentIds = (user.children || []).map(c => c.id).sort().join(',');
          const newIds = result.children.map(c => c.id).sort().join(',');
          if (currentIds !== newIds) {
            // 변경 있으면 metadata 업데이트
            await authService.updateUserMetadata({ children: result.children });
            set({ user: { ...user, children: result.children } });
          }
        }
      } else {
        // 자녀: links 테이블에서 부모 ID 조회 → parentId metadata 동기화
        const result = await connectionService.getMyParentId(user.id);
        if (result.success && result.parentId && result.parentId !== user.parentId) {
          await authService.updateUserMetadata({ parentId: result.parentId });
          set({ user: { ...user, parentId: result.parentId } });
        }
      }
    } catch (err) {
      console.error('Failed to sync connections:', err);
    }
  },

  // 활동 데이터 로드 (Supabase에서)
  loadActivities: async () => {
    const { user } = get();
    if (!user) return;

    const todayDate = new Date().toISOString().split('T')[0];

    if (user.role === 'child') {
      // 자녀: 본인 활동만 조회
      const result = await activityService.getMyActivities();
      if (result.success && result.activities) {
        const todayActivities = result.activities.filter(a => a.date === todayDate);
        set({ activities: result.activities, todayActivities });
      }
    } else {
      // 부모: 자녀들 활동 조회
      const childIds = (user.children || []).map(c => c.id);
      const result = await activityService.getChildrenActivities(childIds);
      if (result.success && result.activities) {
        const todayActivities = result.activities.filter(a => a.date === todayDate);
        set({ activities: result.activities, todayActivities });
      }
    }
  },

  // 승인 대기 활동 로드 (부모용)
  loadPendingApprovals: async () => {
    const { user } = get();
    if (!user || user.role !== 'parent') return;

    const childIds = (user.children || []).map(c => c.id);
    const result = await activityService.getPendingActivities(childIds);
    if (result.success && result.activities) {
      set({ pendingApprovals: result.activities });
    }
  },

  // 활동 추가 (Supabase에 저장)
  addActivity: async (activity) => {
    const result = await activityService.addActivity(activity);
    if (result.success && result.activity) {
      const { activities, user } = get();
      const todayDate = new Date().toISOString().split('T')[0];
      const newActivities = [result.activity, ...activities];
      const todayActivities = newActivities.filter(a => a.date === todayDate);
      const pendingApprovals = newActivities.filter(a => !a.approved && a.requiresApproval);
      set({ activities: newActivities, todayActivities, pendingApprovals });

      // 승인 필요 활동이면 부모에게 알림
      if (result.activity.requiresApproval && !result.activity.approved && user) {
        notifyParentsOfNewActivity(user, result.activity);
      }

      return true;
    }
    return false;
  },

  // 활동 업데이트
  updateActivity: async (id, updates) => {
    const result = await activityService.updateActivity(id, updates);
    if (result.success && result.activity) {
      const { activities } = get();
      const todayDate = new Date().toISOString().split('T')[0];
      const newActivities = activities.map(a => a.id === id ? result.activity! : a);
      const todayActivities = newActivities.filter(a => a.date === todayDate);
      const pendingApprovals = newActivities.filter(a => !a.approved && a.requiresApproval);
      set({ activities: newActivities, todayActivities, pendingApprovals });
    }
  },

  // 활동 삭제
  removeActivity: async (id) => {
    const result = await activityService.deleteActivity(id);
    if (result.success) {
      const { activities } = get();
      const todayDate = new Date().toISOString().split('T')[0];
      const newActivities = activities.filter(a => a.id !== id);
      const todayActivities = newActivities.filter(a => a.date === todayDate);
      const pendingApprovals = newActivities.filter(a => !a.approved && a.requiresApproval);
      set({ activities: newActivities, todayActivities, pendingApprovals });
    }
  },

  // 활동 승인
  approveActivity: async (id) => {
    const { user, activities } = get();
    if (!user) return;

    const activity = activities.find(a => a.id === id);
    if (!activity) return;

    const result = await activityService.approveActivity(id, user.id);
    if (result.success && result.activity) {
      const todayDate = new Date().toISOString().split('T')[0];
      const newActivities = activities.map(a => a.id === id ? result.activity! : a);
      const todayActivities = newActivities.filter(a => a.date === todayDate);
      const pendingApprovals = newActivities.filter(a => !a.approved && a.requiresApproval);
      set({ activities: newActivities, todayActivities, pendingApprovals });

      // 자녀에게 승인 알림
      notifyChildOfDecision(user, activity, 'approved');
    }
  },

  setActivities: (activities) => {
    const todayDate = new Date().toISOString().split('T')[0];
    const todayActivities = activities.filter(a => a.date === todayDate);
    set({ activities, todayActivities });
  },

  setPendingApprovals: (pendingApprovals) => set({ pendingApprovals }),

  updateBalance: async (amount) => {
    const { user } = get();
    if (user) {
      const newBalance = user.balance + amount;
      const newTotalEarned = amount > 0 ? user.totalEarned + amount : user.totalEarned;
      const newTotalSpent = amount < 0 ? user.totalSpent + Math.abs(amount) : user.totalSpent;

      // Supabase에 메타데이터 업데이트
      const result = await authService.updateUserMetadata({
        balance: newBalance,
        totalEarned: newTotalEarned,
        totalSpent: newTotalSpent,
      });

      if (result.success && result.user) {
        set({ user: result.user });
      } else {
        // 로컬에서라도 업데이트
        const updatedUser = {
          ...user,
          balance: newBalance,
          totalEarned: newTotalEarned,
          totalSpent: newTotalSpent,
        };
        set({ user: updatedUser });
      }
    }
  },
  // 알림 목록 로드
  loadNotifications: async () => {
    const { user } = get();
    if (!user) return;
    const result = await notificationService.getMyNotifications(user.id);
    if (result.success && result.notifications) {
      set({ notifications: result.notifications });
    }
  },

  // 안 읽은 알림 수 로드
  loadUnreadCount: async () => {
    const { user } = get();
    if (!user) return;
    const result = await notificationService.getUnreadCount(user.id);
    if (result.success && result.count !== undefined) {
      set({ unreadNotificationCount: result.count });
    }
  },

  // 알림 읽음 처리
  markNotificationRead: async (notificationId) => {
    await notificationService.markAsRead(notificationId);
    const { notifications } = get();
    const updated = notifications.map(n =>
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    set({
      notifications: updated,
      unreadNotificationCount: updated.filter(n => !n.isRead).length,
    });
  },

  // 전체 읽음 처리
  markAllNotificationsRead: async () => {
    const { user } = get();
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    const { notifications } = get();
    set({
      notifications: notifications.map(n => ({ ...n, isRead: true })),
      unreadNotificationCount: 0,
    });
  },

  // 실시간 알림 추가
  addNotification: (notification) => {
    const { notifications } = get();
    set({
      notifications: [notification, ...notifications],
      unreadNotificationCount: get().unreadNotificationCount + 1,
    });
  },

  // 활동 거절 (알림 포함)
  rejectActivity: async (id) => {
    const { user, activities } = get();
    if (!user) return;

    const activity = activities.find(a => a.id === id);
    if (!activity) return;

    // 자녀에게 거절 알림 (삭제 전에 보내야 함)
    await notifyChildOfDecision(user, activity, 'rejected');

    // 활동 삭제
    const result = await activityService.deleteActivity(id);
    if (result.success) {
      const todayDate = new Date().toISOString().split('T')[0];
      const newActivities = activities.filter(a => a.id !== id);
      const todayActivities = newActivities.filter(a => a.date === todayDate);
      const pendingApprovals = newActivities.filter(a => !a.approved && a.requiresApproval);
      set({ activities: newActivities, todayActivities, pendingApprovals });
    }
  },
}));

// 오늘 번 시간 계산
export const useTodayEarned = () => {
  const todayActivities = useStore(state => state.todayActivities);
  return todayActivities
    .filter(a => a.type === 'earn' && a.approved)
    .reduce((sum, a) => sum + a.earnedTime, 0);
};

// 오늘 쓴 시간 계산
export const useTodaySpent = () => {
  const todayActivities = useStore(state => state.todayActivities);
  return todayActivities
    .filter(a => a.type === 'spend')
    .reduce((sum, a) => sum + a.duration, 0);
};

// 오늘 벌금 계산
export const useTodayPenalty = () => {
  const todayActivities = useStore(state => state.todayActivities);
  return todayActivities
    .filter(a => a.type === 'penalty')
    .reduce((sum, a) => sum + a.earnedTime, 0);
};

// 전체 잔액 계산 (activities 기반 - 항상 정확)
export const useComputedBalance = () => {
  const activities = useStore(state => state.activities);
  const earned = activities
    .filter(a => a.type === 'earn' && a.approved)
    .reduce((sum, a) => sum + a.earnedTime, 0);
  const spent = activities
    .filter(a => a.type === 'spend')
    .reduce((sum, a) => sum + a.duration, 0);
  const penalty = activities
    .filter(a => a.type === 'penalty')
    .reduce((sum, a) => sum + a.earnedTime, 0);
  return earned - spent - penalty;
};

// 전체 번 시간
export const useTotalEarned = () => {
  const activities = useStore(state => state.activities);
  return activities
    .filter(a => a.type === 'earn' && a.approved)
    .reduce((sum, a) => sum + a.earnedTime, 0);
};

// 전체 쓴 시간
export const useTotalSpent = () => {
  const activities = useStore(state => state.activities);
  return activities
    .filter(a => a.type === 'spend')
    .reduce((sum, a) => sum + a.duration, 0);
};
