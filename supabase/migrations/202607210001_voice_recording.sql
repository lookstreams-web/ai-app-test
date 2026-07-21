alter table public.analyses
  drop constraint if exists analyses_status_check;

alter table public.analyses
  add constraint analyses_status_check check (status in (
    'queued', 'leased', 'transcribing', 'analyzing', 'researching', 'adjudicating',
    'scoring', 'synthesizing', 'completed', 'partial', 'needs_review', 'failed'
  ));

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
      a.status in ('leased', 'transcribing', 'analyzing', 'researching', 'adjudicating', 'scoring', 'synthesizing')
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
    and status in ('leased', 'transcribing', 'analyzing', 'researching', 'adjudicating', 'scoring', 'synthesizing');
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.lease_next_analysis(text, integer) from public;
revoke all on function public.renew_analysis_lease(uuid, text, integer) from public;

grant execute on function public.lease_next_analysis(text, integer) to service_role;
grant execute on function public.renew_analysis_lease(uuid, text, integer) to service_role;
