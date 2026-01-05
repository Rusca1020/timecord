// 사용자 역할
export type UserRole = 'child' | 'parent';

// 활동 타입
export type ActivityType = 'earn' | 'spend' | 'penalty' | 'exchange' | 'neutral';

// 시간 버는 활동 카테고리
export type EarnCategory =
  | 'holiday_base'      // 휴일 기본 1시간
  | 'academy_study'     // 학원/과외 공부 (1배)
  | 'academy_homework'  // 학원/과외 숙제 (1배)
  | 'self_study'        // 스스로 공부 (1.5배, 엄마 확인)
  | 'reading'           // 독서 + 독후감 (1.5배, 엄마 확인)
  | 'good_deed'         // 좋은 일 (1.5배, 엄마 확인)
  | 'coding'            // 코딩/AI (2배, 아빠 확인)
  | 'app_complete'      // 앱 완성 (+100시간, 아빠 확인)
  | 'app_store';        // 앱스토어 등록 (+1000시간)

// 시간 쓰는 활동 카테고리
export type SpendCategory =
  | 'game'              // 컴퓨터 게임
  | 'youtube';          // 유튜브

// 벌금 카테고리
export type PenaltyCategory =
  | 'no_record'         // 기록 안함 (-1시간)
  | 'unauthorized_use'  // 잔액 없이 사용 (-2시간)
  | 'false_record';     // 거짓 기록 (-10시간)

// 중립 활동 카테고리
export type NeutralCategory =
  | 'drawing'           // 그림 그리기
  | 'game_creation';    // 게임에서 게임 만들기

// 승인 필요 여부
export type ApproverType = 'mom' | 'dad' | null;

// 사용자 데이터
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  parentId?: string;        // 자녀인 경우 연결된 부모 ID
  childrenIds?: string[];   // 부모인 경우 연결된 자녀 ID 목록
  balance: number;          // 현재 잔액 (시간)
  totalEarned: number;      // 총 번 시간
  totalSpent: number;       // 총 쓴 시간
  createdAt: Date;
}

// 활동 기록
export interface Activity {
  id: string;
  userId: string;
  date: string;             // YYYY-MM-DD 형식
  type: ActivityType;
  category: EarnCategory | SpendCategory | PenaltyCategory | NeutralCategory;
  duration: number;         // 입력 시간 (시간 단위)
  multiplier: number;       // 배수
  earnedTime: number;       // 실제 반영 시간 (duration * multiplier)
  startTime?: string;       // HH:MM 형식
  endTime?: string;         // HH:MM 형식
  description?: string;     // 메모
  requiresApproval: boolean;
  approverType?: ApproverType;
  approved: boolean;
  approvedBy?: string;      // 승인한 부모 ID
  approvedAt?: Date;
  createdAt: Date;
}

// 저금 교환 요청
export interface Exchange {
  id: string;
  userId: string;
  hours: number;            // 교환할 시간
  amount: number;           // 교환 금액 (원)
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  requestedAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
}

// 일별 요약
export interface DailySummary {
  date: string;
  previousBalance: number;  // 전날 저금
  earnedTime: number;       // 번 시간
  spentTime: number;        // 쓴 시간
  penaltyTime: number;      // 벌금
  finalBalance: number;     // 최종 잔액
  activities: Activity[];
}

// 인증 관련 타입
export type AuthProvider = 'email' | 'google';

// 회원가입 폼 데이터
export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

// 로그인 폼 데이터
export interface LoginFormData {
  email: string;
  password: string;
}
