-- Color Lab only. Apply to a dedicated Supabase project after merchant ownership confirmation.
-- No migration is applied automatically by GitHub/Vercel.
create extension if not exists pgcrypto;
create table if not exists public.colorlab_orders (
 stripe_session_id text primary key,
 stripe_payment_intent text unique,
 email text not null check (char_length(email) between 3 and 254),
 product_ids text[] not null check (cardinality(product_ids) between 1 and 7),
 amount_total integer not null check (amount_total >= 0),
 currency text not null check (currency = 'eur'),
 state text not null default 'pending' check (state in ('pending','paid','failed','refunded')),
 email_sent_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists colorlab_orders_created_idx on public.colorlab_orders(created_at desc);
create table if not exists public.colorlab_stripe_events (
 id text primary key,
 type text not null,
 stripe_created bigint,
 processed_at timestamptz not null default now()
);
alter table public.colorlab_orders enable row level security;
alter table public.colorlab_stripe_events enable row level security;
revoke all on table public.colorlab_orders from anon, authenticated;
revoke all on table public.colorlab_stripe_events from anon, authenticated;
grant select,insert,update,delete on table public.colorlab_orders to service_role;
grant select,insert,update,delete on table public.colorlab_stripe_events to service_role;
-- There must be NO anon/authenticated policies for these tables.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('colorlab-downloads','colorlab-downloads',false,50000000,array['application/zip','application/octet-stream'])
 on conflict (id) do nothing;
-- DO NOT grant public storage.objects SELECT access. Upload from admin/server only.
