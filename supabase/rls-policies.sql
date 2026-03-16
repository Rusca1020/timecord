-- ================================================
-- RLS (Row Level Security) 정책
-- Supabase Dashboard > SQL Editor에서 실행
-- ================================================

-- ================================================
-- 1. activities 테이블 — DELETE 정책 + INSERT 정책 수정
-- ================================================

-- 기존 INSERT 정책 삭제 (부모 벌금 부여를 위해 교체)
DROP POLICY IF EXISTS "Users can insert own activities" ON public.activities;

-- 새 INSERT 정책: 본인 또는 부모가 자녀에게 INSERT 가능
CREATE POLICY "Users can insert own activities"
  ON public.activities FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.parent_child_links
      WHERE parent_id = auth.uid() AND child_id = activities.user_id
    )
  );

-- 자녀: 자기 활동 삭제 가능
DROP POLICY IF EXISTS "Users can delete own activities" ON public.activities;
CREATE POLICY "Users can delete own activities"
  ON public.activities FOR DELETE
  USING (auth.uid() = user_id);

-- 부모: 자녀 활동 삭제 가능
DROP POLICY IF EXISTS "Parents can delete children activities" ON public.activities;
CREATE POLICY "Parents can delete children activities"
  ON public.activities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_links
      WHERE parent_id = auth.uid() AND child_id = activities.user_id
    )
  );

-- ================================================
-- 2. profiles 테이블
-- ================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 모든 유저가 프로필 조회 가능 (이메일 검색용)
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- 자기 프로필만 수정 가능
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 자기 프로필만 생성 가능
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ================================================
-- 3. parent_child_links 테이블
-- ================================================
ALTER TABLE public.parent_child_links ENABLE ROW LEVEL SECURITY;

-- 부모 또는 자녀 본인만 조회 가능
DROP POLICY IF EXISTS "Users can view own links" ON public.parent_child_links;
CREATE POLICY "Users can view own links"
  ON public.parent_child_links FOR SELECT
  USING (auth.uid() = parent_id OR auth.uid() = child_id);

-- 부모만 링크 생성 가능
DROP POLICY IF EXISTS "Parents can create links" ON public.parent_child_links;
CREATE POLICY "Parents can create links"
  ON public.parent_child_links FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- 부모만 링크 삭제 가능
DROP POLICY IF EXISTS "Parents can delete links" ON public.parent_child_links;
CREATE POLICY "Parents can delete links"
  ON public.parent_child_links FOR DELETE
  USING (auth.uid() = parent_id);

-- ================================================
-- 4. exchanges 테이블
-- ================================================
ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;

-- 자녀: 자기 교환만 조회
DROP POLICY IF EXISTS "Users can view own exchanges" ON public.exchanges;
CREATE POLICY "Users can view own exchanges"
  ON public.exchanges FOR SELECT
  USING (auth.uid() = user_id);

-- 부모: 자녀 교환 조회
DROP POLICY IF EXISTS "Parents can view children exchanges" ON public.exchanges;
CREATE POLICY "Parents can view children exchanges"
  ON public.exchanges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_links
      WHERE parent_id = auth.uid() AND child_id = exchanges.user_id
    )
  );

-- 자녀: 자기 교환 요청 생성
DROP POLICY IF EXISTS "Users can insert own exchanges" ON public.exchanges;
CREATE POLICY "Users can insert own exchanges"
  ON public.exchanges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 부모: 자녀 교환 상태 업데이트
DROP POLICY IF EXISTS "Parents can update children exchanges" ON public.exchanges;
CREATE POLICY "Parents can update children exchanges"
  ON public.exchanges FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_links
      WHERE parent_id = auth.uid() AND child_id = exchanges.user_id
    )
  );

-- ================================================
-- 5. notifications 테이블
-- ================================================
-- type 제약 조건에 'penalty' 추가
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('approval_request', 'approved', 'rejected', 'penalty', 'exchange_request', 'exchange_approved', 'exchange_rejected'));

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 본인 알림만 조회
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

-- 누구나 알림 생성 가능 (부모↔자녀 알림 전송)
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Anyone can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- 본인 알림만 업데이트 (읽음 처리)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

-- ================================================
-- 6. push_tokens 테이블
-- ================================================
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- 본인 토큰만 조회/관리
DROP POLICY IF EXISTS "Users can manage own push tokens" ON public.push_tokens;
CREATE POLICY "Users can manage own push tokens"
  ON public.push_tokens FOR ALL
  USING (auth.uid() = user_id);
