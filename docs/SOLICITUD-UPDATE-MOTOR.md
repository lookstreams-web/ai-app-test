# Solicitud de update al motor: entrada por voz (contrato + worker + migración)

Para: desarrollador del motor (`packages/analysis-contracts`, `apps/analysis-worker`,
migración de `analyses`)
De: Joel
Contexto: voy a agregar grabación de voz en la home. Siguiendo la decisión de
`ARQUITECTURA.md` (la web no ejecuta OpenAI; solo prepara y encola), la
transcripción corre como **etapa previa dentro del worker**, que ya tiene leases,
reintentos y timeouts. Yo entrego el paquete de transcripción listo; tú cableas el
worker y el contrato.

## Lo que NO cambia

- El motor de análisis (`packages/analysis-engine`) no toca audio jamás: `engine.analyze()`
  sigue recibiendo `AnalysisJobInput` con segmentos de texto. Cero cambios en
  agentes, scoring, provenance y adapters (salvo el punto 2 sobre `source`).
- El transcript ya está resuelto: uso `origin: "speechToText"`, que el enum acepta
  desde el día uno.
- Contexto público: `options.publicContext: false` (ya existe), así que el
  investigador de contexto ni se invoca.

## Lo que entrego yo (Joel)

- **`packages/audio-transcription` (`@motor/audio-transcription`)**, con tests:
  `transcribeAudio(audio, { language, onProgress })` → `{ language, segments, fullText, durationSeconds }`.
  Internamente: chunking ffmpeg por duración (5 min, 16kHz mono mp3) + llamadas a
  la API de audio de OpenAI con contexto rodante. Segmentos ya en el formato del
  contrato (`id`, `startSeconds`, `endSeconds`, `text`, `confidence: null`).
  Deps: `ffmpeg-static`, `ffprobe-static`, `openai` (usa el `OPENAI_API_KEY` que el
  worker ya tiene).
- La rama web: endpoint multipart que sube el audio al bucket privado
  `analysis-audio/{analysisId}.webm` y encola el sobre (punto 1).
- La UI (grabación, dashboard, i18n).

## Cambios solicitados

### 1. Contrato: sobre de trabajo en la cola (`@motor/analysis-contracts`)

Hoy la fila de `analyses` siempre trae un `AnalysisJobInput` completo. Para audio,
la web encola un **sobre pendiente de transcripción**; propongo:

```ts
export const audioJobEnvelopeSchema = z.object({
  kind: z.literal("audioPending"),
  audioPath: z.string().min(1),          // objeto en el bucket analysis-audio
  language: z.enum(["es", "en"]),        // idioma esperado de la grabación
  outputLanguage: z.enum(["es", "en"]).default("es"),
  recordedAt: z.string().nullable().default(null)
}).strict();

export const analysisQueueInputSchema = z.union([
  analysisJobInputSchema,               // lo de siempre (YouTube)
  audioJobEnvelopeSchema
]);
```

### 2. Contrato: variante de `source` para voz (`analysisJobInputSchema`)

`source` exige hoy `url`, `videoId`, `title` y `channel.name` (strict) — una
grabación no tiene nada de eso. Propongo unión discriminada, con default que
mantiene válidos todos los inputs existentes:

```ts
const youtubeSourceSchema = z.object({
  kind: z.literal("youtube").default("youtube"),
  url: urlSchema,
  videoId: z.string().min(1),
  title: z.string().min(1),
  durationSeconds: z.number().positive().nullable(),
  channel: z.object({
    id: z.string().min(1).nullable(),
    name: z.string().min(1),
    url: urlSchema.nullable().default(null)
  }).strict()
}).strict();

const voiceRecordingSourceSchema = z.object({
  kind: z.literal("voiceRecording"),
  title: z.string().min(1),              // p. ej. "Grabación de voz"
  durationSeconds: z.number().positive().nullable(),
  recordedAt: z.string().nullable().default(null)
}).strict();

source: z.discriminatedUnion("kind", [youtubeSourceSchema, voiceRecordingSourceSchema])
```

Si prefieres otra forma (campos nullable, otro discriminador), me adapto — lo que
necesito es que un input sin url/videoId/canal valide.

Puntos del motor que leen `source` y deben tolerar la variante (los revisé, son pocos):

- `openai-gateway.ts`: prompts que interpolan `source.title` y `source.channel.name`
  (planClaims, researchClaim). Con voz: usar `title` y un fallback tipo
  `"Grabación de voz del usuario"`. `researchContext`/`auditProvenance` no corren
  con `publicContext: false`.
- `adapters.ts`: los campos de `source` que copian los reportes deben tolerar la
  variante sin url/canal.
- `contracts.test.ts`: caso nuevo `kind: "voiceRecording"` + `origin: "speechToText"`.

### 3. Worker: etapa previa de transcripción (`apps/analysis-worker`)

Al tomar el lease, si `input.kind === "audioPending"`:

1. `setProgress('transcribing', 0–30)` (progreso mapeado con el `onProgress` por chunk).
2. Descargar `audioPath` del bucket con el cliente service-role que ya tiene.
3. `transcribeAudio(...)` de `@motor/audio-transcription`.
4. Construir el `AnalysisJobInput` de texto:
   `source: { kind: "voiceRecording", title, durationSeconds, recordedAt }`,
   `transcript: { language, origin: "speechToText", coverage: 1, segments }`,
   `options: { outputLanguage, publicContext: false }`.
5. **Persistir ese input en la fila** (update de `input`) antes de llamar a
   `engine.analyze()`: si el análisis falla y se reintenta, el siguiente intento
   encuentra texto y no re-transcribe.
6. Borrar el objeto de Storage tras persistir el input; también en fallo terminal
   (`releaseOrRetry` → `failed`).

La transcripción queda cubierta por el lease/heartbeat/timeout existentes; el
presupuesto (`ANALYSIS_TIMEOUT_MS` / `timeBudgetMs`) ahora incluye la transcripción —
dime si prefieres un presupuesto separado.

### 4. Migración SQL (tabla `analyses`, que es tuya)

- Agregar `'transcribing'` al `check` de `status`.
- Incluir `'transcribing'` en la lista de estados activos de `lease_next_analysis`
  (recuperación de leases vencidos) y de `renew/setProgress` — hoy listan
  `('leased', 'analyzing', 'researching', 'adjudicating', 'scoring', 'synthesizing')`.
- No hacen falta columnas nuevas: la ruta del audio viaja en el `input` jsonb.

## Criterio de aceptación

1. Este input valida y `engine.analyze()` corre de punta a punta sin contexto público:

```ts
analysisJobInputSchema.parse({
  source: { kind: "voiceRecording", title: "Grabación de voz", durationSeconds: 412, recordedAt: null },
  transcript: {
    language: "es",
    origin: "speechToText",
    coverage: 1,
    segments: [{ id: "segment-1", startSeconds: 0, endSeconds: 300, text: "…", confidence: null }]
  },
  options: { outputLanguage: "es", publicContext: false }
})
```

2. Una fila encolada con el sobre `audioPending` (y un audio corto en el bucket)
   pasa por `transcribing` → etapas del motor → `completed`, y el objeto de audio
   desaparece del bucket.
3. Un reintento tras fallo del análisis no vuelve a transcribir.
4. Todos los inputs de YouTube existentes (sin `kind`) siguen validando sin cambios
   en la web app (gracias al `.default("youtube")`).
5. `pnpm typecheck && pnpm test` en verde.

Con esto publicado desbloqueo las Fases 2–3 de `docs/PLAN-GRABACION-VOZ.md`.
El paquete `@motor/audio-transcription` te lo entrego antes de que empieces el
punto 3, con la firma de arriba congelada. Cualquier duda me dices.
