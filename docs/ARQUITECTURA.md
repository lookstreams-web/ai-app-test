# Arquitectura (backend) — Jorge

Andamiaje de la app: schema Supabase, estructura Next.js, rate limit, integración de
transcript de YouTube y el pipeline de backend que exige el contrato (`CONTRATO.md`).

## Responsabilidades cubiertas aquí

- **Schema Supabase** (`supabase/migrations/0001_init.sql`): enums, tabla `analyses`,
  tabla+función de rate limit, RLS.
- **Schema Zod** (`lib/schema.ts`): fuente de verdad ejecutable del contrato.
  Incluye `analysisLlmSchema` (salida del LLM) y `responseSchema` (respuesta completa).
- **Pipeline de backend** (`lib/pipeline.ts`): normaliza `breakdown` a 100, canonicaliza
  cada `quote` (fuzzy match → `timestampSeconds` + substring exacto), inyecta
  `verification: null`, aplica el guardarraíl del `hypeIndex` y valida la respuesta.
- **YouTube transcript** (`lib/youtube/transcript.ts`): URL → segmentos con timestamps.
- **Rate limit** (`lib/ratelimit.ts` + función SQL): ventana deslizante por IP hasheada.
- **API routes**: `POST /api/analyses`, `GET /api/analyses/[id]`, `POST /api/transcript`,
  `GET /api/health`.

## Stubs para el equipo

- `lib/engine/index.ts` — motor de análisis OpenAI (**Eduardo**). Lanza "not implemented";
  el pipeline corre end-to-end y deja la fila en `failed` hasta que se conecte.
- `lib/transcribe/audio.ts` — voz→texto / Whisper para `sourceType: "audio"` (**Joel**).
- `app/page.tsx` y `app/analysis/[id]/page.tsx` — placeholders; la UI final la hace **Joel**.

## Flujo de `POST /api/analyses`

```
rate limit (ip_hash)
  → validar body (Zod)
  → insertar fila (pending)
  → YouTube: transcribing → fetch transcript (segments + fullText + título)
     texto:  usar el texto tal cual
  → analyzing → analyzeContent()  [motor de Eduardo]
  → validar salida (analysisLlmSchema)
  → buildMeta() + assembleResponse()  [canonicalización + guardarraíl]
  → validar responseSchema → persistir (completed)
```

Reglas de respuesta: fallos **antes** de crear la fila (validación, rate limit) → 4xx
`{ error: { code, message } }`. Una vez creada la fila, la respuesta es 200 con el snapshot
`{ id, status, result, error }`.

Ejecución **inline** (opción A). La opción B (id inmediato + proceso en background con
`after()`) queda como mejora futura.

## Setup local

```bash
pnpm install
cp .env.example .env.local   # rellenar credenciales de Supabase
# aplicar supabase/migrations/0001_init.sql en el proyecto Supabase
pnpm dev
```

## Deploy (Railway)

- Servicio Node. Build `pnpm build`, start `pnpm start` (Next respeta `PORT`).
- Cargar todas las variables de `.env.example`.
- Aplicar la migración en Supabase antes del primer arranque.

## Pendientes / follow-ups

- Extracción de artículos (`sourceType: "article"`) — hoy responde 501.
- Etapa stretch de verificación web (pobla `verification`) — **Eduardo**.
- Migración a flujo asíncrono (opción B) si los análisis superan el timeout de request.
