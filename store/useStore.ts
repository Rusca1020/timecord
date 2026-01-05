import { create } from 'zustand';
import { Platform } from 'react-native';
import { User, Activity, SignupFormData } from '@/types';

// localStorage 헬퍼 (웹 전용)
const storage = {
  get: (key: string) => {
    if (Platform.OS !== 'web') return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  set: (key: string, value: any) => {
    if (Platform.OS !== 'web') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  remove: (key: string) => {
    if (Platform.OS !== 'web') return;
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

// localStorage에서 저장된 데이터 불러오기
const savedUser = storage.get('timecord-user');
const savedActivities = storage.get('timecord-activities') || [];

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

// 더미 사용자 데이터
const dummyUsers: Record<string, User> = {
  'parent@test.com': {
    id: 'parent-1',
    name: '김부모',
    email: 'parent@test.com',
    role: 'parent',
    childrenIds: ['child-1'],
    balance: 0,
    totalEarned: 0,
    totalSpent: 0,
    createdAt: new Date('2024-01-01'),
  },
  'child@test.com': {
    id: 'child-1',
    name: '김자녀',
    email: 'child@test.com',
    role: 'child',
    parentId: 'parent-1',
    balance: 15.5,
    totalEarned: 50,
    totalSpent: 34.5,
    createdAt: new Date('2024-01-01'),
  },
};

// 더미 활동 데이터
const today = new Date().toISOString().split('T')[0];
const dummyActivities: Activity[] = [
  {
    id: 'act-1',
    userId: 'child-1',
    date: today,
    type: 'earn',
    category: 'self_study',
    duration: 2,
    multiplier: 1.5,
    earnedTime: 3,
    startTime: '14:00',
    endTime: '16:00',
    description: '수학 문제집 풀기',
    requiresApproval: true,
    approverType: 'mom',
    approved: false,
    createdAt: new Date(),
  },
  {
    id: 'act-2',
    userId: 'child-1',
    date: today,
    type: 'earn',
    category: 'coding',
    duration: 1,
    multiplier: 2,
    earnedTime: 2,
    startTime: '17:00',
    endTime: '18:00',
    description: 'React Native 공부',
    requiresApproval: true,
    approverType: 'dad',
    approved: false,
    createdAt: new Date(),
  },
  {
    id: 'act-3',
    userId: 'child-1',
    date: today,
    type: 'earn',
    category: 'academy_study',
    duration: 2,
    multiplier: 1,
    earnedTime: 2,
    startTime: '10:00',
    endTime: '12:00',
    description: '영어학원',
    requiresApproval: false,
    approverType: null,
    approved: true,
    createdAt: new Date(),
  },
  {
    id: 'act-4',
    userId: 'child-1',
    date: today,
    type: 'spend',
    category: 'game',
    duration: 1,
    multiplier: 1,
    earnedTime: -1,
    startTime: '19:00',
    endTime: '20:00',
    description: '마인크래프트',
    requiresApproval: false,
    approverType: null,
    approved: true,
    createdAt: new Date(),
  },
];

// 초기 활동 데이터 (localStorage에 저장된 것 또는 더미 데이터)
const initialActivities: Activity[] = savedActivities.length > 0 ? savedActivities : dummyActivities;

const initialState = {
  user: savedUser || null,
  isAuthenticated: !!savedUser,
  isLoading: false,
  authError: null,
  activities: initialActivities,
  todayActivities: initialActivities.filter((a: Activity) => a.date === today),
  pendingApprovals: initialActivities.filter((a: Activity) => !a.approved && a.requiresApproval),
};

export const useStore = create<AppState>()((set, get) => ({
      ...initialState,

      setUser: (user) => {
        storage.set('timecord-user', user);
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
          authError: null,
        });
      },

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
        storage.set('timecord-user', user);
        set({ user, isAuthenticated: true, isLoading: false });
      },

      // 로그인 (더미 계정 사용)
      signIn: async (email: string, password: string) => {
        set({ isLoading: true, authError: null });

        // 더미 계정 확인
        const dummyUser = dummyUsers[email];
        if (dummyUser) {
          storage.set('timecord-user', dummyUser);
          set({ user: dummyUser, isAuthenticated: true, isLoading: false });
          return;
        }

        // 더미 계정이 없으면 새 계정 생성
        const user: User = {
          id: 'user-' + Date.now(),
          name: email.split('@')[0],
          email: email,
          role: 'child',
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          createdAt: new Date(),
        };
        storage.set('timecord-user', user);
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
        storage.remove('timecord-user');
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          authError: null,
        });
      },

      // 활동 관련 액션들
      setActivities: (activities) => {
        const todayDate = new Date().toISOString().split('T')[0];
        const todayActivities = activities.filter(a => a.date === todayDate);
        storage.set('timecord-activities', activities);
        set({ activities, todayActivities });
      },

      addActivity: (activity) => {
        const { activities } = get();
        const todayDate = new Date().toISOString().split('T')[0];
        const newActivities = [...activities, activity];
        const todayActivities = newActivities.filter(a => a.date === todayDate);
        const pendingApprovals = newActivities.filter(a => !a.approved && a.requiresApproval);
        storage.set('timecord-activities', newActivities);
        set({ activities: newActivities, todayActivities, pendingApprovals });
      },

      updateActivity: (id, updates) => {
        const { activities } = get();
        const todayDate = new Date().toISOString().split('T')[0];
        const newActivities = activities.map(a =>
          a.id === id ? { ...a, ...updates } : a
        );
        const todayActivities = newActivities.filter(a => a.date === todayDate);
        const pendingApprovals = newActivities.filter(a => !a.approved && a.requiresApproval);
        storage.set('timecord-activities', newActivities);
        set({ activities: newActivities, todayActivities, pendingApprovals });
      },

      removeActivity: (id) => {
        const { activities } = get();
        const todayDate = new Date().toISOString().split('T')[0];
        const newActivities = activities.filter(a => a.id !== id);
        const todayActivities = newActivities.filter(a => a.date === todayDate);
        const pendingApprovals = newActivities.filter(a => !a.approved && a.requiresApproval);
        storage.set('timecord-activities', newActivities);
        set({ activities: newActivities, todayActivities, pendingApprovals });
      },

      setPendingApprovals: (pendingApprovals) => set({ pendingApprovals }),

      updateBalance: (amount) => {
        const { user } = get();
        if (user) {
          const updatedUser = {
            ...user,
            balance: user.balance + amount
          };
          storage.set('timecord-user', updatedUser);
          set({ user: updatedUser });
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
