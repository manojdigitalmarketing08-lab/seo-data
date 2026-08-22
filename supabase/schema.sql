-- Base schema for the SEO Keyword API SaaS project.
-- Project: seo-mcp-saas (pcmsotnmkxeriapajyco), ap-southeast-1.

create extension if not exists pgcrypto;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  api_key text unique not null default encode(extensions.gen_random_bytes(24), 'hex'),
  plan text not null default 'free' check (plan = any (array['free', 'starter', 'pro'])),
  monthly_quota integer not null default 50,
  quota_used_this_period integer not null default 0,
  period_reset_at timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  paddle_customer_id text,
  paddle_subscription_id text,
  status text not null default 'active' check (status = any (array['active', 'past_due', 'cancelled'])),
  created_at timestamptz not null default now()
);

create table public.keyword_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique not null,
  seed_keywords text,
  location text,
  result_json jsonb,
  cached_at timestamptz not null default now(),
  hit_count integer not null default 0
);

create table public.usage_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  tool_name text,
  cache_hit boolean not null default false,
  called_at timestamptz not null default now()
);
