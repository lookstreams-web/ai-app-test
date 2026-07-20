create extension if not exists pgcrypto;

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  input jsonb not null,
  status text not null default 'queued' check (status in (
    'queued', 'leased', 'analyzing', 'researching', 'adjudicating',
    'scoring', 'synthesizing', 'completed', 'partial', 'needs_review', 'failed'
  )),
  progress smallint not null default 0 check (progress between 0 and 100),
  priority smallint not null default 0,
  attempts smallint not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  internal_report_v2 jsonb,
  public_diagnosis jsonb,
  legacy_v1_report jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists analyses_queue_idx
  on public.analyses (priority desc, next_attempt_at, created_at)
  where status = 'queued';
create index if not exists analyses_expired_lease_idx
  on public.analyses (lease_expires_at)
  where lease_expires_at is not null;

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  agent text not null,
  model text not null,
  prompt_version text not null,
  duration_ms integer not null check (duration_ms >= 0),
  input_tokens integer,
  output_tokens integer,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  external_id text not null,
  text text not null,
  quote text not null,
  start_seconds numeric not null check (start_seconds >= 0),
  end_seconds numeric not null check (end_seconds >= start_seconds),
  normalized_weight numeric not null check (normalized_weight between 0 and 1),
  priority_rank integer,
  is_central_promise boolean not null default false,
  sensitive_domain text not null default 'none',
  outcome text not null check (outcome in (
    'supported', 'mostlySupported', 'misleadingMissingContext', 'contradicted',
    'disputed', 'insufficientEvidence', 'notYetVerifiable'
  )),
  confidence numeric not null check (confidence between 0 and 1),
  coverage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (analysis_id, external_id)
);

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  claim_external_id text,
  external_id text not null,
  url text not null,
  title text not null,
  publisher text,
  excerpt text not null,
  stance text not null,
  source_type text not null,
  published_at text,
  retrieved_at timestamptz not null,
  quality jsonb not null,
  procedural_status text not null,
  origin_cluster_id text not null,
  content_hash text,
  created_at timestamptz not null default now(),
  unique (analysis_id, external_id)
);

alter table public.analyses enable row level security;
alter table public.agent_runs enable row level security;
alter table public.claims enable row level security;
alter table public.evidence enable row level security;

create or replace function public.lease_next_analysis(
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns setof public.analyses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select a.id into v_id
  from public.analyses a
  where (
    (a.status = 'queued' and a.next_attempt_at <= now())
    or (
      a.status in ('leased', 'analyzing', 'researching', 'adjudicating', 'scoring', 'synthesizing')
      and a.lease_expires_at < now()
    )
  )
  order by a.priority desc, a.next_attempt_at, a.created_at
  for update skip locked
  limit 1;

  if v_id is null then
    return;
  end if;

  return query
  update public.analyses
  set status = 'leased',
      progress = greatest(progress, 1),
      attempts = attempts + 1,
      lease_owner = p_worker_id,
      lease_expires_at = now() + make_interval(secs => greatest(60, p_lease_seconds)),
      last_error = null,
      updated_at = now()
  where id = v_id
  returning *;
end;
$$;

create or replace function public.renew_analysis_lease(
  p_analysis_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.analyses
  set lease_expires_at = now() + make_interval(secs => greatest(60, p_lease_seconds)),
      updated_at = now()
  where id = p_analysis_id
    and lease_owner = p_worker_id
    and status in ('leased', 'analyzing', 'researching', 'adjudicating', 'scoring', 'synthesizing');
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.release_or_retry_analysis(
  p_analysis_id uuid,
  p_worker_id text,
  p_error text,
  p_max_attempts integer default 3
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.analyses
  set status = case when attempts >= p_max_attempts then 'failed' else 'queued' end,
      next_attempt_at = case
        when attempts >= p_max_attempts then next_attempt_at
        else now() + make_interval(secs => least(300, 5 * power(2, greatest(0, attempts - 1))::integer))
      end,
      lease_owner = null,
      lease_expires_at = null,
      last_error = left(p_error, 2000),
      updated_at = now()
  where id = p_analysis_id and lease_owner = p_worker_id;
end;
$$;

create or replace function public.complete_analysis(
  p_analysis_id uuid,
  p_worker_id text,
  p_final_status text,
  p_internal_report jsonb,
  p_public_report jsonb,
  p_legacy_v1_report jsonb,
  p_claims jsonb,
  p_evidence jsonb,
  p_agent_runs jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_final_status not in ('completed', 'partial', 'needs_review') then
    raise exception 'invalid final status: %', p_final_status;
  end if;

  if not exists (
    select 1 from public.analyses
    where id = p_analysis_id and lease_owner = p_worker_id
    for update
  ) then
    raise exception 'analysis lease is missing or belongs to another worker';
  end if;

  delete from public.agent_runs where analysis_id = p_analysis_id;

  insert into public.agent_runs (
    analysis_id, agent, model, prompt_version, duration_ms, input_tokens, output_tokens, error
  )
  select p_analysis_id,
    item->>'agent', item->>'model', item->>'promptVersion',
    coalesce((item->>'durationMs')::integer, 0),
    (item->>'inputTokens')::integer,
    (item->>'outputTokens')::integer,
    item->>'error'
  from jsonb_array_elements(coalesce(p_agent_runs, '[]'::jsonb)) item;

  insert into public.claims (
    analysis_id, external_id, text, quote, start_seconds, end_seconds,
    normalized_weight, is_central_promise, sensitive_domain, outcome, confidence, coverage
  )
  select p_analysis_id,
    item->>'id', item->>'text', item->>'quote',
    (item->>'startSeconds')::numeric, (item->>'endSeconds')::numeric,
    (item->>'weight')::numeric, coalesce((item->>'isCentralPromise')::boolean, false),
    coalesce(item->>'sensitiveDomain', 'none'), item->>'outcome',
    coalesce((item->>'confidence')::numeric, 0),
    jsonb_build_object('approvedEvidenceIds', coalesce(item->'approvedEvidenceIds', '[]'::jsonb))
  from jsonb_array_elements(coalesce(p_claims, '[]'::jsonb)) item
  on conflict (analysis_id, external_id) do update set
    text = excluded.text,
    quote = excluded.quote,
    start_seconds = excluded.start_seconds,
    end_seconds = excluded.end_seconds,
    normalized_weight = excluded.normalized_weight,
    is_central_promise = excluded.is_central_promise,
    sensitive_domain = excluded.sensitive_domain,
    outcome = excluded.outcome,
    confidence = excluded.confidence,
    coverage = excluded.coverage;

  insert into public.evidence (
    analysis_id, claim_external_id, external_id, url, title, publisher, excerpt,
    stance, source_type, published_at, retrieved_at, quality, procedural_status,
    origin_cluster_id, content_hash
  )
  select p_analysis_id,
    item->>'claimId', item->>'id', item->>'url', item->>'title', item->>'publisher', item->>'excerpt',
    item->>'stance', item->>'sourceType', item->>'publishedAt',
    (item->>'retrievedAt')::timestamptz,
    jsonb_build_object(
      'directness', item->'directness',
      'temporalFit', item->'temporalFit',
      'geographicFit', item->'geographicFit',
      'independence', item->'independence'
    ),
    item->>'proceduralStatus', item->>'originClusterId', item->>'contentHash'
  from jsonb_array_elements(coalesce(p_evidence, '[]'::jsonb)) item
  on conflict (analysis_id, external_id) do update set
    claim_external_id = excluded.claim_external_id,
    url = excluded.url,
    title = excluded.title,
    publisher = excluded.publisher,
    excerpt = excluded.excerpt,
    stance = excluded.stance,
    source_type = excluded.source_type,
    published_at = excluded.published_at,
    retrieved_at = excluded.retrieved_at,
    quality = excluded.quality,
    procedural_status = excluded.procedural_status,
    origin_cluster_id = excluded.origin_cluster_id,
    content_hash = excluded.content_hash;

  update public.analyses
  set status = p_final_status,
      progress = 100,
      internal_report_v2 = p_internal_report,
      public_diagnosis = p_public_report,
      legacy_v1_report = p_legacy_v1_report,
      lease_owner = null,
      lease_expires_at = null,
      last_error = null,
      completed_at = now(),
      updated_at = now()
  where id = p_analysis_id;
end;
$$;

revoke all on function public.lease_next_analysis(text, integer) from public;
revoke all on function public.renew_analysis_lease(uuid, text, integer) from public;
revoke all on function public.release_or_retry_analysis(uuid, text, text, integer) from public;
revoke all on function public.complete_analysis(uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;

grant execute on function public.lease_next_analysis(text, integer) to service_role;
grant execute on function public.renew_analysis_lease(uuid, text, integer) to service_role;
grant execute on function public.release_or_retry_analysis(uuid, text, text, integer) to service_role;
grant execute on function public.complete_analysis(uuid, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;
