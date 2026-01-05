import { create } from 'zustand';
import { User, Activity, SignupFormData } from '@/types';

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

  // 기본 액션
  setUser: (user: User | null) => void;
  setIsLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;

  // 인증 액션
  signUp: (formData: SignupFormData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (user: User) => void;
  initializeAuth: (uid: string) => Promise<void>;
  logout: () => Promise<void>;

  // 활동 액션
  setActivities: (activities: Activity[]) => void;
  addActivity: (activity: Activity) => void;
  updateActivity: (id: string, updates: Partial<Activity>) => void;
  removeActivity: (id: string) => void;
  setPendingApprovals: (activities: Activity[]) => void;

  // 잔액 업데이트
  updateBalance: (amount: number) => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,
  activities: [],
  todayActivities: [],
  pendingApprovals: [],
};

export const useStore = create<AppState>()((set, get) => ({
      ...initialState,

      setUser: (user) => set({
        user,
        isAuthenticated: !!user,
        isLoading: false,
        authError: null,
      }),

      setIsLoading: (isLoading) => set({ isLoading }),

      setAuthError: (authError) => set({ authError, isLoading: false }),

      // 회원가입 (로컬)
      signUp: async (formData: SignupFormData) => {
        set({ isLoading: true, authError: null });
        const user: User = {
          id: 'user-' + Date.now(),
          name: formData.name,
          email: formData.email,
          role: formData.role,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          createdAt: new Date(),
        };
        set({ user, isAuthenticated: true, isLoading: false });
      },

      // 로그인 (로컬)
      signIn: async (email: string, password: string) => {
        set({ isLoading: true, authError: null });
        // 임시 로그인 - 항상 성공
        const user: User = {
          id: 'user-' + Date.now(),
          name: email.split('@')[0],
          email: email,
          role: 'child',
          balance: 120,
          totalEarned: 500,
          totalSpent: 380,
          createdAt: new Date(),
        };
        set({ user, isAuthenticated: true, isLoading: false });
      },

      // Google 로그인 (외부에서 처리 후 호출)
      signInWithGoogle: (user: User) => {
        set({ user, isAuthenticated: true, isLoading: false, authError: null });
      },

      // 초기화 (로컬)
      initializeAuth: async (uid: string) => {
        set({ isLoading: false });
      },

      // 로그아웃
      logout: async () => {
        set({ ...initialState, isLoading: false });
      },

      // 활동 관련 액션들
      setActivities: (activities) => {
        const today = new Date().toISOString().split('T')[0];
        const todayActivities = activities.filter(a => a.date === today);
        set({ activities, todayActivities });
      },

      addActivity: (activity) => {
        const { activities } = get();
        const today = new Date().toISOString().split('T')[0];
        const newActivities = [...activities, activity];
        const todayActivities = newActivities.filter(a => a.date === today);
        set({ activities: newActivities, todayActivities });
      },

      updateActivity: (id, updates) => {
        const { activities } = get();
        const today = new Date().toISOString().split('T')[0];
        const newActivities = activities.map(a =>
          a.id === id ? { ...a, ...updates } : a
        );
        const todayActivities = newActivities.filter(a => a.date === today);
        set({ activities: newActivities, todayActivities });
      },

      removeActivity: (id) => {
        const { activities } = get();
        const today = new Date().toISOString().split('T')[0];
        const newActivities = activities.filter(a => a.id !== id);
        const todayActivities = newActivities.filter(a => a.date === today);
        set({ activities: newActivities, todayActivities });
      },

      setPendingApprovals: (pendingApprovals) => set({ pendingApprovals }),

      updateBalance: (amount) => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              balance: user.balance + amount
            }
          });
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
