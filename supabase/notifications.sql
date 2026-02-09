-- ================================================
-- notifications 테이블: 인앱 알림 저장
-- ================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text,
  type text not null check (type in ('approval_request', 'approved', 'rejected')),
  activity_id uuid references public.activities(id) on delete set null,
  title text not null,
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- RLS 비활성화 (테스트 중)
alter table public.notifications disable row level security;

-- 인덱스
create index if not exists idx_notifications_recipient on public.notifications(recipient_id);
create index if not exists idx_notifications_read on public.notifications(recipient_id, is_read);

-- 실시간 구독을 위한 publication 설정
alter publication supabase_realtime add table public.notifications;

-- ================================================
-- push_tokens 테이블: 기기별 푸시 토큰 저장
-- ================================================
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text check (platform in ('ios', 'android', 'web')),
  created_at timestamptz default now(),
  unique(user_id, token)
);

-- RLS 비활성화 (테스트 중)
alter table public.push_tokens disable row level security;

-- 인덱스
create index if not exists idx_push_tokens_user_id on public.push_tokens(user_id);
