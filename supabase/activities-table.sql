-- Timecord Activities 테이블 생성
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- 1. activities 테이블 생성
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'penalty', 'neutral')),
  category TEXT NOT NULL,
  duration DECIMAL(10,2) DEFAULT 0,
  multiplier DECIMAL(10,2) DEFAULT 1,
  earned_time DECIMAL(10,2) DEFAULT 0,
  start_time TEXT,
  end_time TEXT,
  description TEXT,
  requires_approval BOOLEAN DEFAULT FALSE,
  approver_type TEXT CHECK (approver_type IN ('mom', 'dad', NULL)),
  approved BOOLEAN DEFAULT TRUE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON public.activities(date);
CREATE INDEX IF NOT EXISTS idx_activities_approved ON public.activities(approved);

-- 3. RLS (Row Level Security) 활성화
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 생성

-- 자녀: 자신의 활동만 조회/생성/수정 가능
CREATE POLICY "Users can view own activities"
  ON public.activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities"
  ON public.activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON public.activities FOR UPDATE
  USING (auth.uid() = user_id);

-- 부모: 자녀의 활동 조회 가능 (자녀의 parentId가 부모 id인 경우)
CREATE POLICY "Parents can view children activities"
  ON public.activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = public.activities.user_id
      AND (u.raw_user_meta_data->>'parentId')::UUID = auth.uid()
    )
  );

-- 부모: 자녀의 활동 승인 가능
CREATE POLICY "Parents can approve children activities"
  ON public.activities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = public.activities.user_id
      AND (u.raw_user_meta_data->>'parentId')::UUID = auth.uid()
    )
  );

-- 5. 실시간 구독을 위한 publication 설정
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
