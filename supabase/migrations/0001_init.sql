-- Entrada web de Jorge: rate limit compartido por IP hasheada.
-- La tabla analyses y la cola son creadas por 202607200001_analysis_engine.sql.

create table if not exists public.rate_limit_hits (
  id bigint generated always as identity primary key,
  identifier text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_lookup_idx
  on public.rate_limit_hits (identifier, created_at desc);
create index if not exists rate_limit_hits_created_idx
  on public.rate_limit_hits (created_at);

create or replace function public.check_and_record_rate_limit(
  p_identifier text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_max < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit configuration';
  end if;

  -- Serializa solicitudes del mismo identificador para que count+insert sea atómico.
  perform pg_advisory_xact_lock(hashtextextended(p_identifier, 0));

  delete from public.rate_limit_hits
  where created_at < now() - make_interval(secs => p_window_seconds * 4);

  select count(*) into v_count
  from public.rate_limit_hits
  where identifier = p_identifier
    and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max then
    return false;
  end if;

  insert into public.rate_limit_hits (identifier) values (p_identifier);
  return true;
end;
$$;

alter table public.rate_limit_hits enable row level security;

revoke all on table public.rate_limit_hits from public, anon, authenticated;
revoke all on function public.check_and_record_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_and_record_rate_limit(text, integer, integer)
  to service_role;
