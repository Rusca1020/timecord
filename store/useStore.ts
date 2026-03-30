import { create } from 'zustand';
import { User, Activity, Exchange, AppNotification, SignupFormData, PenaltyCategory, CustomActivity, ApproverType } from '@/types';
import * as authService from '@/services/authService';
import * as activityService from '@/services/activityService';
import * as connectionService from '@/services/connectionService';
import * as notificationService from '@/services/notificationService';
import * as exchangeService from '@/services/exchangeService';
import * as customActivityService from '@/services/customActivityService';
import { notifyParentsOfNewActivity, notifyChildOfDecision, notifyChildOfPenalty, notifyParentsOfExchange, notifyChildOfExchangeDecision } from '@/services/notificationHelpers';
import { EXCHANGE_RATE, PENALTY_ACTIVITIES } from '@/constants/activities';

// Snackbar 타입
type SnackbarType = 'error' | 'success' | 'info';

interface AppState {
  // 사용자 상태
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  pendingVerificationEmail: string | null;

  // 활동 기록
  activities: Activity[];
  todayActivities: Activity[];

  // 승인 대기 중인 활동 (부모용)
  pendingApprovals: Activity[];

  // 알림
  notifications: AppNotification[];
  unreadNotificationCount: number;

  // 교환
  exchanges: Exchange[];
  pendingExchanges: Exchange[];

  // 커스텀 활동
  customActivities: CustomActivity[];

  // Snackbar
  snackbarMessage: string | null;
  snackbarType: SnackbarType;

  // 기본 액션
  setUser: (user: User | null) => void;
  setIsLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;

  // 인증 액션
  signUp: (formData: SignupFormData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  clearPendingVerification: () => void;

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

  // 벌금 부여 (부모 → 자녀)
  assignPenalty: (childId: string, childName: string, category: PenaltyCategory, description?: string) => Promise<boolean>;

  // 활동 수정
  editActivity: (id: string, updates: Partial<Activity>) => Promise<boolean>;

  // 프로필 편집
  updateProfile: (name: string) => Promise<boolean>;
  updateAvatar: (avatar: string) => Promise<boolean>;

  // 교환 액션
  loadExchanges: () => Promise<void>;
  requestExchange: (hours: number) => Promise<boolean>;
  approveExchange: (exchangeId: string) => Promise<void>;
  rejectExchange: (exchangeId: string) => Promise<void>;
  completeExchange: (exchangeId: string) => Promise<void>;
  setExchanges: (exchanges: Exchange[]) => void;
  setPendingExchanges: (exchanges: Exchange[]) => void;

  // 커스텀 활동 액션
  loadCustomActivities: () => Promise<void>;
  addCustomActivity: (activity: {
    type: 'earn' | 'spend' | 'neutral';
    label: string;
    multiplier?: number;
    requiresApproval?: boolean;
    approverType?: ApproverType;
    description?: string;
  }) => Promise<boolean>;
  removeCustomActivity: (id: string) => Promise<boolean>;

  // Snackbar 액션
  showSnackbar: (message: string, type?: SnackbarType) => void;
  hideSnackbar: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,
  pendingVerificationEmail: null as string | null,
  activities: [],
  todayActivities: [],
  pendingApprovals: [],
  notifications: [],
  unreadNotificationCount: 0,
  exchanges: [],
  pendingExchanges: [],
  customActivities: [] as CustomActivity[],
  snackbarMessage: null as string | null,
  snackbarType: 'info' as SnackbarType,
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

    if (result.success && result.needsVerification) {
      // 이메일 인증 대기 상태
      set({
        isAuthenticated: false,
        pendingVerificationEmail: formData.email,
        isLoading: false,
      });
    } else if (result.success && result.user) {
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
      if (!result.user.emailVerified) {
        // 이메일 미인증 상태 → 인증 대기 화면으로
        set({
          isAuthenticated: false,
          pendingVerificationEmail: result.user.email,
          isLoading: false,
          authError: '이메일 인증을 먼저 완료해주세요.',
        });
        return;
      }
      set({ user: result.user, isAuthenticated: true, isLoading: false });
      // 로그인 후 연결 동기화 + 활동 데이터 + 알림 + 교환 로드
      await get().syncConnections();
      await get().loadActivities();
      await get().loadCustomActivities();
      if (get().user?.role === 'parent') {
        await get().loadPendingApprovals();
      }
      await get().loadNotifications();
      await get().loadUnreadCount();
      await get().loadExchanges();
    } else {
      set({ authError: result.error || '로그인에 실패했습니다.', isLoading: false });
    }
  },

  // 초기화 (세션 복원)
  initializeAuth: async () => {
    set({ isLoading: true });

    const user = await authService.getCurrentUser();

    if (user) {
      if (!user.emailVerified) {
        // 이메일 미인증 상태
        set({
          user: null,
          isAuthenticated: false,
          pendingVerificationEmail: user.email,
          isLoading: false,
        });
        return;
      }
      set({ user, isAuthenticated: true, isLoading: false });
      // 세션 복원 후 연결 동기화 + 활동 데이터 + 알림 + 교환 로드
      await get().syncConnections();
      await get().loadActivities();
      await get().loadCustomActivities();
      if (get().user?.role === 'parent') {
        await get().loadPendingApprovals();
      }
      await get().loadNotifications();
      await get().loadUnreadCount();
      await get().loadExchanges();
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  // 이메일 인증 대기 상태 초기화
  clearPendingVerification: () => {
    set({ pendingVerificationEmail: null, authError: null });
  },

  // 로그아웃
  logout: async () => {
    await authService.signOut();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      authError: null,
      pendingVerificationEmail: null,
      activities: [],
      todayActivities: [],
      pendingApprovals: [],
      notifications: [],
      unreadNotificationCount: 0,
      exchanges: [],
      pendingExchanges: [],
      customActivities: [],
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

    try {
      if (user.role === 'child') {
        const result = await activityService.getMyActivities();
        if (result.success && result.activities) {
          const todayActivities = result.activities.filter(a => a.date === todayDate);
          set({ activities: result.activities, todayActivities });
        } else {
          get().showSnackbar('활동 데이터를 불러오지 못했습니다.', 'error');
        }
      } else {
        const childIds = (user.children || []).map(c => c.id);
        const result = await activityService.getChildrenActivities(childIds);
        if (result.success && result.activities) {
          const todayActivities = result.activities.filter(a => a.date === todayDate);
          set({ activities: result.activities, todayActivities });
        } else {
          get().showSnackbar('활동 데이터를 불러오지 못했습니다.', 'error');
        }
      }
    } catch {
      get().showSnackbar('활동 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
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
  // 교환 목록 로드
  loadExchanges: async () => {
    const { user } = get();
    if (!user) return;

    try {
      if (user.role === 'parent') {
        const childIds = (user.children || []).map(c => c.id);
        const result = await exchangeService.getChildrenExchanges(childIds);
        if (result.success && result.exchanges) {
          set({
            exchanges: result.exchanges,
            pendingExchanges: result.exchanges.filter(e => e.status === 'pending'),
          });
        } else {
          get().showSnackbar('교환 내역을 불러오지 못했습니다.', 'error');
        }
      } else {
        const result = await exchangeService.getMyExchanges(user.id);
        if (result.success && result.exchanges) {
          set({ exchanges: result.exchanges });
        } else {
          get().showSnackbar('교환 내역을 불러오지 못했습니다.', 'error');
        }
      }
    } catch {
      get().showSnackbar('교환 내역을 불러오는 중 오류가 발생했습니다.', 'error');
    }
  },

  // 교환 신청 (자녀)
  requestExchange: async (hours) => {
    const { user } = get();
    if (!user) return false;

    const amount = hours * EXCHANGE_RATE.perHour;
    const result = await exchangeService.requestExchange(user.id, user.name, hours, amount);
    if (!result.success || !result.exchange) return false;

    // activities에 exchange 타입 활동 추가 (잔액 차감용)
    const exchangeActivity: Omit<Activity, 'id' | 'createdAt'> = {
      userId: user.id,
      userName: user.name,
      date: new Date().toISOString().split('T')[0],
      type: 'exchange',
      category: 'game' as any, // exchange는 카테고리 불필요, placeholder
      duration: hours,
      multiplier: 1,
      earnedTime: hours, // useComputedBalance에서 exchange 타입 차감
      requiresApproval: false,
      approved: true,
      description: `${hours}시간 → ${amount.toLocaleString()}원 교환`,
    };
    await get().addActivity(exchangeActivity);

    // 교환 목록 갱신
    const { exchanges } = get();
    set({ exchanges: [result.exchange, ...exchanges] });

    // 부모에게 알림
    notifyParentsOfExchange(user, result.exchange);

    return true;
  },

  // 교환 승인 (부모)
  approveExchange: async (exchangeId) => {
    const { user, exchanges } = get();
    if (!user) return;

    const exchange = exchanges.find(e => e.id === exchangeId);
    if (!exchange) return;

    const result = await exchangeService.approveExchange(exchangeId, user.id);
    if (result.success) {
      const updated = exchanges.map(e => e.id === exchangeId ? { ...e, status: 'approved' as const } : e);
      set({
        exchanges: updated,
        pendingExchanges: updated.filter(e => e.status === 'pending'),
      });
      notifyChildOfExchangeDecision(user, exchange, 'exchange_approved');
    }
  },

  // 교환 거절 (부모) - 잔액 복원을 위해 exchange activity 삭제
  rejectExchange: async (exchangeId) => {
    const { user, exchanges, activities } = get();
    if (!user) return;

    const exchange = exchanges.find(e => e.id === exchangeId);
    if (!exchange) return;

    const result = await exchangeService.rejectExchange(exchangeId);
    if (result.success) {
      // 해당 교환에 대한 activity 삭제 (잔액 복원)
      const exchangeActivity = activities.find(
        a => a.type === 'exchange' && a.userId === exchange.userId &&
             a.duration === exchange.hours &&
             a.description?.includes(`${exchange.hours}시간`)
      );
      if (exchangeActivity) {
        await activityService.deleteActivity(exchangeActivity.id);
        const todayDate = new Date().toISOString().split('T')[0];
        const newActivities = activities.filter(a => a.id !== exchangeActivity.id);
        set({
          activities: newActivities,
          todayActivities: newActivities.filter(a => a.date === todayDate),
        });
      }

      const updated = exchanges.map(e => e.id === exchangeId ? { ...e, status: 'rejected' as const } : e);
      set({
        exchanges: updated,
        pendingExchanges: updated.filter(e => e.status === 'pending'),
      });
      notifyChildOfExchangeDecision(user, exchange, 'exchange_rejected');
    }
  },

  setExchanges: (exchanges) => set({ exchanges }),
  setPendingExchanges: (pendingExchanges) => set({ pendingExchanges }),

  // 커스텀 활동 로드
  loadCustomActivities: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const result = await customActivityService.getCustomActivities(user.id);
      if (result.success && result.activities) {
        set({ customActivities: result.activities });
      }
    } catch {
      console.error('Failed to load custom activities');
    }
  },

  // 커스텀 활동 추가
  addCustomActivity: async (activity) => {
    const { user } = get();
    if (!user) return false;

    const result = await customActivityService.addCustomActivity({
      userId: user.id,
      ...activity,
    });

    if (result.success && result.activity) {
      const { customActivities } = get();
      set({ customActivities: [...customActivities, result.activity] });
      return true;
    }
    return false;
  },

  // 커스텀 활동 삭제
  removeCustomActivity: async (id) => {
    const result = await customActivityService.deleteCustomActivity(id);
    if (result.success) {
      const { customActivities } = get();
      set({ customActivities: customActivities.filter(a => a.id !== id) });
      return true;
    }
    return false;
  },

  // Snackbar
  showSnackbar: (message, type = 'info') => set({ snackbarMessage: message, snackbarType: type }),
  hideSnackbar: () => set({ snackbarMessage: null }),

  // 알림 목록 로드
  loadNotifications: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const result = await notificationService.getMyNotifications(user.id);
      if (result.success && result.notifications) {
        set({ notifications: result.notifications });
      } else {
        get().showSnackbar('알림을 불러오지 못했습니다.', 'error');
      }
    } catch {
      get().showSnackbar('알림을 불러오는 중 오류가 발생했습니다.', 'error');
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

  assignPenalty: async (childId, childName, category, description) => {
    const { user, activities } = get();
    if (!user) return false;

    const penaltyInfo = PENALTY_ACTIVITIES[category];
    const todayDate = new Date().toISOString().split('T')[0];

    const penaltyActivity: Omit<Activity, 'id' | 'createdAt'> = {
      userId: childId,
      userName: childName,
      date: todayDate,
      type: 'penalty',
      category,
      duration: penaltyInfo.hours,
      multiplier: 1,
      earnedTime: penaltyInfo.hours,
      description: description || penaltyInfo.description,
      requiresApproval: false,
      approved: true,
    };

    const result = await activityService.addActivity(penaltyActivity);
    if (result.success && result.activity) {
      const newActivities = [result.activity, ...activities];
      const todayActivities = newActivities.filter(a => a.date === todayDate);
      set({ activities: newActivities, todayActivities });

      // 자녀에게 벌금 알림
      await notifyChildOfPenalty(user, childId, penaltyInfo.label, penaltyInfo.hours);
      return true;
    }
    return false;
  },

  editActivity: async (id, updates) => {
    const { activities } = get();

    const result = await activityService.updateActivity(id, updates);
    if (result.success && result.activity) {
      const todayDate = new Date().toISOString().split('T')[0];
      const newActivities = activities.map(a => a.id === id ? result.activity! : a);
      const todayActivities = newActivities.filter(a => a.date === todayDate);
      const pendingApprovals = newActivities.filter(a => !a.approved && a.requiresApproval);
      set({ activities: newActivities, todayActivities, pendingApprovals });
      return true;
    }
    return false;
  },

  updateProfile: async (name) => {
    const { user } = get();
    if (!user) return false;

    const result = await authService.updateUserName(name);
    if (result.success && result.user) {
      set({ user: result.user });
      return true;
    }
    return false;
  },

  updateAvatar: async (avatar) => {
    const { user } = get();
    if (!user) return false;

    const result = await authService.updateAvatar(avatar);
    if (result.success && result.user) {
      set({ user: result.user });
      return true;
    }
    return false;
  },

  completeExchange: async (exchangeId) => {
    const { exchanges } = get();

    const result = await exchangeService.completeExchange(exchangeId);
    if (result.success && result.exchange) {
      const newExchanges = exchanges.map(e =>
        e.id === exchangeId ? result.exchange! : e
      );
      set({ exchanges: newExchanges });
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
  const exchanged = activities
    .filter(a => a.type === 'exchange')
    .reduce((sum, a) => sum + a.duration, 0);
  return earned - spent - penalty - exchanged;
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
