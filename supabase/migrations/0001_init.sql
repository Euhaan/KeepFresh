-- 칸칸 서버 스키마. 가정 단위로 완전히 분리되며, 모든 접근은 memberships를 통해 RLS로 강제된다.
-- 앱은 이벤트를 올리고(append-only) 다른 기기의 이벤트를 받아 재생한다. 읽기용 스냅샷 표는 2차에서 추가한다.

create extension if not exists pgcrypto;

create type member_role as enum ('owner', 'member', 'viewer');

create table households (
  id text primary key,
  name text not null,
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now()
);

create table memberships (
  household_id text not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id text not null,                 -- 앱 안에서 쓰는 구성원 ID (이벤트의 by)
  display_name text not null,
  role member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index memberships_user_idx on memberships(user_id);

create table invites (
  code text primary key,
  household_id text not null references households(id) on delete cascade,
  role member_role not null default 'member',
  expires_at timestamptz not null default now() + interval '24 hours',
  created_by uuid not null references auth.users(id)
);

-- 추가 전용 이벤트 로그. body에는 type별 페이로드가 들어간다.
create table events (
  id text primary key,
  household_id text not null references households(id) on delete cascade,
  txn text not null,
  at timestamptz not null,
  by_member text not null,
  type text not null,
  body jsonb not null,
  inserted_at timestamptz not null default now()
);
create index events_household_at_idx on events(household_id, at);

-- 공용 식품 사전. 쓰기는 서비스 롤(서버 함수)만.
create table presets (
  key text primary key,
  version int not null default 1,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- 공용 바코드 카탈로그 캐시. 식약처 조회 결과를 서버 함수가 적재한다.
create table barcode_catalog (
  barcode text primary key,
  product_name text not null,
  maker text,
  preset_key text references presets(key),
  shelf_life_text text,
  source text not null default 'mfds',
  fetched_at timestamptz not null default now()
);

-- ─── RLS ───
alter table households enable row level security;
alter table memberships enable row level security;
alter table invites enable row level security;
alter table events enable row level security;
alter table presets enable row level security;
alter table barcode_catalog enable row level security;

-- 내가 속한 가정 목록. 토큰 클레임으로 캐시하는 것은 2차 최적화.
create or replace function my_household_ids() returns setof text
language sql stable security definer set search_path = public as $$
  select household_id from memberships where user_id = auth.uid()
$$;

create or replace function my_role(hid text) returns member_role
language sql stable security definer set search_path = public as $$
  select role from memberships where user_id = auth.uid() and household_id = hid
$$;

create policy "members read household" on households for select using (id in (select my_household_ids()));
create policy "owner updates household" on households for update using (my_role(id) = 'owner');
create policy "anyone creates household" on households for insert with check (auth.uid() is not null);

create policy "members read memberships" on memberships for select using (household_id in (select my_household_ids()));
create policy "owner manages memberships" on memberships for all using (my_role(household_id) = 'owner');
create policy "self joins via invite" on memberships for insert with check (user_id = auth.uid());

create policy "members read invites" on invites for select using (household_id in (select my_household_ids()));
create policy "owner creates invites" on invites for insert with check (my_role(household_id) = 'owner');

create policy "members read events" on events for select using (household_id in (select my_household_ids()));
-- 보기 전용은 차감(ITEM_QTY)과 장보기 체크만 올릴 수 있다.
create policy "members append events" on events for insert with check (
  household_id in (select my_household_ids())
  and (
    my_role(household_id) in ('owner', 'member')
    or type in ('ITEM_QTY', 'SHOP_PATCH')
  )
);
-- 이벤트는 수정·삭제 불가 (되돌리기는 보상 이벤트로)

create policy "everyone reads presets" on presets for select using (true);
create policy "everyone reads barcodes" on barcode_catalog for select using (true);

-- 실시간 구독 대상
alter publication supabase_realtime add table events;
