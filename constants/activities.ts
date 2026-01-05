import { EarnCategory, SpendCategory, PenaltyCategory, NeutralCategory, ApproverType } from '@/types';

// 시간 버는 활동 설정
export const EARN_ACTIVITIES: Record<EarnCategory, {
  label: string;
  multiplier: number;
  fixedHours?: number;  // 고정 시간 (배수 대신)
  requiresApproval: boolean;
  approverType: ApproverType;
  description: string;
}> = {
  holiday_base: {
    label: '휴일 기본',
    multiplier: 1,
    fixedHours: 1,
    requiresApproval: false,
    approverType: null,
    description: '휴일에는 기본 1시간',
  },
  academy_study: {
    label: '학원/과외 공부',
    multiplier: 1,
    requiresApproval: false,
    approverType: null,
    description: '학원 또는 과외에서 공부하기',
  },
  academy_homework: {
    label: '학원/과외 숙제',
    multiplier: 1,
    requiresApproval: false,
    approverType: null,
    description: '학원 또는 과외 숙제하기',
  },
  self_study: {
    label: '스스로 공부',
    multiplier: 1.5,
    requiresApproval: true,
    approverType: 'mom',
    description: '스스로 공부하고 엄마에게 확인',
  },
  reading: {
    label: '독서 + 독후감',
    multiplier: 1.5,
    requiresApproval: true,
    approverType: 'mom',
    description: '스스로 책 읽고 독후감 써서 엄마에게 확인',
  },
  good_deed: {
    label: '좋은 일',
    multiplier: 1.5,
    requiresApproval: true,
    approverType: 'mom',
    description: '좋은 일하고 엄마에게 확인',
  },
  coding: {
    label: '코딩/AI 프로그래밍',
    multiplier: 2,
    requiresApproval: true,
    approverType: 'dad',
    description: '코딩 또는 AI로 프로그래밍하고 아빠에게 확인',
  },
  app_complete: {
    label: '앱 완성',
    multiplier: 1,
    fixedHours: 100,
    requiresApproval: true,
    approverType: 'dad',
    description: '앱 한개 스스로 만들어서 아빠에게 확인',
  },
  app_store: {
    label: '앱스토어 등록',
    multiplier: 1,
    fixedHours: 1000,
    requiresApproval: true,
    approverType: 'dad',
    description: '애플 스토어에 앱 만들어서 올리기',
  },
};

// 시간 쓰는 활동 설정
export const SPEND_ACTIVITIES: Record<SpendCategory, {
  label: string;
  description: string;
}> = {
  game: {
    label: '컴퓨터 게임',
    description: '컴퓨터 게임 하기',
  },
  youtube: {
    label: '유튜브',
    description: '유튜브 보기',
  },
};

// 벌금 설정
export const PENALTY_ACTIVITIES: Record<PenaltyCategory, {
  label: string;
  hours: number;
  description: string;
}> = {
  no_record: {
    label: '기록 안함',
    hours: 1,
    description: '시간 관리 즉 카톡에 기록 안하면 벌금',
  },
  unauthorized_use: {
    label: '잔액 없이 사용',
    hours: 2,
    description: '시간 안남아 있는데 게임 또는 유튜브하면 벌금',
  },
  false_record: {
    label: '거짓 기록',
    hours: 10,
    description: '거짓말로 시간 기록하면 벌금',
  },
};

// 중립 활동 설정
export const NEUTRAL_ACTIVITIES: Record<NeutralCategory, {
  label: string;
  description: string;
}> = {
  drawing: {
    label: '그림 그리기',
    description: '그림 그리기는 시간 버는 것도 쓰는 것도 아님',
  },
  game_creation: {
    label: '게임에서 게임 만들기',
    description: '게임에서 게임 만들기는 별도로 하기',
  },
};

// 저금 교환 비율
export const EXCHANGE_RATE = {
  hours: 10,        // 10시간
  amount: 30000,    // 3만원
  perHour: 3000,    // 시간당 3천원
};

// 활동 타입 라벨
export const ACTIVITY_TYPE_LABELS = {
  earn: '시간 벌기',
  spend: '시간 쓰기',
  penalty: '벌금',
  exchange: '교환',
  neutral: '중립',
};
