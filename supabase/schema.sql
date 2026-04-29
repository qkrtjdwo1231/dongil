create extension if not exists "pgcrypto";

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pid text,
  process text,
  product_family text,
  item_code text,
  item_name text not null,
  width numeric,
  height numeric,
  quantity integer not null check (quantity > 0),
  area_pyeong numeric,
  request_no text,
  no text,
  customer text not null,
  site text,
  line text,
  registrant text,
  status text not null default '등록',
  memo text,
  is_favorite_source boolean not null default false
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  process text,
  item_code text,
  item_name text not null,
  width numeric,
  height numeric,
  quantity integer,
  customer text not null,
  site text,
  line text,
  memo text
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique,
  default_site text,
  default_line text,
  memo text
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  item_code text,
  item_name text not null,
  process text,
  width numeric,
  height numeric,
  default_quantity integer,
  memo text
);

create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  original_name text not null,
  stored_bucket text not null,
  stored_path text not null unique,
  sheet_name text,
  total_rows integer not null default 0,
  parsed_rows integer not null default 0,
  status text not null default 'processing',
  header_snapshot jsonb not null default '[]'::jsonb,
  analysis_snapshot jsonb not null default '{}'::jsonb,
  summary_text text,
  error_message text
);

create table if not exists public.uploaded_rows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  file_id uuid not null references public.uploaded_files(id) on delete cascade,
  row_index integer not null,
  event_date date,
  event_month text,
  event_hour integer,
  pid text,
  pid_duplicate boolean not null default false,
  customer text,
  site text,
  process text,
  product_family text,
  item_code text,
  item_name text,
  width numeric,
  height numeric,
  quantity integer,
  line text,
  request_no text,
  registrant text,
  status text,
  memo text,
  area_pyeong numeric,
  is_valid boolean not null default true,
  validation_notes text,
  anomaly_notes text,
  normalized_text text,
  raw_payload jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_memory_rules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  category text not null,
  content text not null,
  priority integer not null default 100,
  is_active boolean not null default true
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  question text not null,
  answer text not null,
  used_file_ids jsonb not null default '[]'::jsonb,
  used_row_ids jsonb not null default '[]'::jsonb
);

alter table if exists public.uploaded_files
  add column if not exists analysis_snapshot jsonb not null default '{}'::jsonb;

alter table if exists public.orders
  add column if not exists product_family text;

alter table if exists public.uploaded_rows
  add column if not exists event_date date;
alter table if exists public.uploaded_rows
  add column if not exists event_month text;
alter table if exists public.uploaded_rows
  add column if not exists event_hour integer;
alter table if exists public.uploaded_rows
  add column if not exists pid_duplicate boolean not null default false;
alter table if exists public.uploaded_rows
  add column if not exists product_family text;
alter table if exists public.uploaded_rows
  add column if not exists anomaly_notes text;

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_customer_idx on public.orders (customer);
create index if not exists orders_site_idx on public.orders (site);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_item_name_idx on public.orders (item_name);
create index if not exists favorites_customer_idx on public.favorites (customer);
create index if not exists items_item_name_idx on public.items (item_name);
create index if not exists uploaded_files_created_at_idx on public.uploaded_files (created_at desc);
create index if not exists uploaded_files_status_idx on public.uploaded_files (status);
create index if not exists uploaded_rows_file_id_idx on public.uploaded_rows (file_id);
create index if not exists uploaded_rows_pid_idx on public.uploaded_rows (pid);
create index if not exists uploaded_rows_customer_idx on public.uploaded_rows (customer);
create index if not exists uploaded_rows_site_idx on public.uploaded_rows (site);
create index if not exists uploaded_rows_item_name_idx on public.uploaded_rows (item_name);
create index if not exists uploaded_rows_row_index_idx on public.uploaded_rows (file_id, row_index);
create index if not exists uploaded_rows_is_valid_idx on public.uploaded_rows (is_valid);
create index if not exists ai_memory_rules_active_priority_idx on public.ai_memory_rules (is_active, priority);
create index if not exists ai_conversations_created_at_idx on public.ai_conversations (created_at desc);
