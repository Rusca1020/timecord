import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Activity, DailySummary } from '@/types';

interface AppState {
  // 사용자 상태
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // 활동 기록
  activities: Activity[];
  todayActivities: Activity[];

  // 승인 대기 중인 활동 (부모용)
  pendingApprovals: Activity[];

  // 액션
  setUser: (user: User | null) => void;
  setIsLoading: (loading: boolean) => void;
  setActivities: (activities: Activity[]) => void;
  addActivity: (activity: Activity) => void;
  updateActivity: (id: string, updates: Partial<Activity>) => void;
  removeActivity: (id: string) => void;
  setPendingApprovals: (activities: Activity[]) => void;

  // 잔액 업데이트
  updateBalance: (amount: number) => void;

  // 로그아웃
  logout: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  activities: [],
  todayActivities: [],
  pendingApprovals: [],
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({
        user,
        isAuthenticated: !!user,
        isLoading: false,
      }),

      setIsLoading: (isLoading) => set({ isLoading }),

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

      logout: () => set(initialState),
    }),
    {
      name: 'timecord-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

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
