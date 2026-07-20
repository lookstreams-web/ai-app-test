-- ai-app-test — esquema inicial (Jorge / arquitectura)
-- Aplicar con `supabase db push` o pegando en el SQL Editor de Supabase.

-- ===================== ENUMS =====================
create type source_type as enum ('youtube', 'article', 'text', 'audio');
create type analysis_status as enum (
  'pending',
  'transcribing',
  'analyzing',
  'verifying',
  'completed',
  'failed'
);

-- ===================== TABLA PRINCIPAL =====================
create table public.analyses (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  completed_at        timestamptz,

  -- fuente
  source_type         source_type not null,
  source_url          text,
  title               text,
  language            text,
  duration_seconds    int,

  -- transcript / texto de entrada
  transcript          text,
  transcript_segments jsonb,               -- TranscriptSegment[] {text, offsetSeconds, durationSeconds}

  -- estado y resultado
  status              analysis_status not null default 'pending',
  hype_index          int check (hype_index between 0 and 100),
  verdict             text,
  result              jsonb,               -- AnalysisResponse completo { meta, analysis }
  error               jsonb,               -- { code, message }

  -- telemetría
  model               text,
  input_tokens        int,
  output_tokens       int,
  ip_hash             text,                -- hash con salt de la IP (nunca en claro)
  duration_ms         int
);

create index analyses_status_idx          on public.analyses (status);
create index analyses_created_at_idx        on public.analyses (created_at desc);
create index analyses_ip_hash_created_idx    on public.analyses (ip_hash, created_at desc);

-- ===================== RATE LIMIT =====================
create table public.rate_limit_hits (
  id          bigint generated always as identity primary key,
  identifier  text not null,
  created_at  timestamptz not null default now()
);
create index rate_limit_hits_lookup_idx on public.rate_limit_hits (identifier, created_at desc);

-- Ventana deslizante atómica. Devuelve true si permite el intento, false si lo bloquea.
create or replace function public.check_and_record_rate_limit(
  p_identifier text,
  p_max int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- limpieza oportunista de registros viejos
  delete from rate_limit_hits
    where created_at < now() - make_interval(secs => p_window_seconds * 4);

  select count(*) into v_count
    from rate_limit_hits
    where identifier = p_identifier
      and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max then
    return false;
  end if;

  insert into rate_limit_hits (identifier) values (p_identifier);
  return true;
end;
$$;

-- ===================== RLS =====================
alter table public.analyses enable row level security;

-- Lectura pública SOLO de análisis completados (para links compartibles /analysis/[id]).
-- Las escrituras van por el backend con service_role (bypassa RLS); no hay policy de write.
create policy "public read completed analyses"
  on public.analyses
  for select
  using (status = 'completed');

alter table public.rate_limit_hits enable row level security;
-- sin policies -> solo service_role puede tocar esta tabla.

-- La función de rate limit se ejecuta como security definer; restringimos su uso
-- explícito desde roles anónimos/autenticados (el backend la llama con service_role).
revoke all on function public.check_and_record_rate_limit(text, int, int) from anon, authenticated;
