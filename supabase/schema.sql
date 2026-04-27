create extension if not exists "pgcrypto";

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pid text,
  process text,
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

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_customer_idx on public.orders (customer);
create index if not exists orders_site_idx on public.orders (site);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_item_name_idx on public.orders (item_name);
create index if not exists favorites_customer_idx on public.favorites (customer);
create index if not exists items_item_name_idx on public.items (item_name);
