-- ================================================
-- profiles 테이블: 이메일로 유저 조회용
-- ================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('parent', 'child')),
  created_at timestamptz default now()
);

-- RLS 비활성화 (테스트 중)
alter table public.profiles disable row level security;

-- 인덱스
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);

-- ================================================
-- parent_child_links 테이블: 부모-자녀 연결 관계
-- ================================================
create table if not exists public.parent_child_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(parent_id, child_id)
);

-- RLS 비활성화 (테스트 중)
alter table public.parent_child_links disable row level security;

-- 인덱스
create index if not exists idx_links_parent_id on public.parent_child_links(parent_id);
create index if not exists idx_links_child_id on public.parent_child_links(child_id);
