# Plan de implementación: grabación de voz como entrada del motor

Estado: propuesto · Julio 2026 · Responsable: Joel
Este plan se implementa en el worktree `grabacion-voz` (rama `worktree-grabacion-voz`).

## Objetivo

Agregar en la home page un botón para grabar audio desde el navegador. El audio se
transcribe a texto (Whisper/OpenAI) y el texto se analiza como cualquier otro
análisis. **El motor (`packages/analysis-engine`) no toca audio jamás: sigue
recibiendo `AnalysisJobInput` con segmentos de texto.**

## Dónde corre cada cosa

```
Navegador            Grabación (MediaRecorder) → Blob webm/opus
motor-web (Railway)  Recibe el multipart, sube el audio a Supabase Storage y
                     encola la fila. NO ejecuta OpenAI (decisión de ARQUITECTURA.md).
Supabase             Solo almacenamiento y cola: bucket privado con el audio
                     transitorio + tabla `analyses`. No ejecuta cómputo.
motor-worker         Etapa previa "transcribing": descarga el audio, lo trocea con
(Railway)            ffmpeg (CPU local del contenedor) y llama a la API de audio de
                     OpenAI chunk por chunk. Luego corre el motor como siempre.
OpenAI               La inferencia de Whisper/transcripción y los agentes del motor.
```

```
Botón grabar → POST /api/analyses (multipart, sourceType: "audio")
  → motor-web sube el audio a Storage y encola { status: 'queued', input: sobre-de-audio }
  → motor-worker toma el lease → etapa 'transcribing' (chunking ffmpeg + Whisper)
  → reemplaza input por el AnalysisJobInput de texto y borra el audio de Storage
  → sigue el pipeline normal: analyzing → researching → … → completed
```

## Decisiones ya tomadas

1. **La transcripción vive en `motor-worker`, no en la capa web.** Respeta la
   decisión de `ARQUITECTURA.md`: la API no ejecuta OpenAI, solo prepara y encola.
   La transcripción hereda gratis los leases, heartbeat, timeouts y reintentos con
   backoff del worker — sin sweeps ni filas huérfanas.
2. **El código de transcripción es un paquete workspace nuevo, `@motor/audio-transcription`,
   que escribe Joel** (voz a texto es responsabilidad de Joel según `PLAN-EDUARDO.md`).
   El worker solo lo invoca. Se porta del repo probado `d:\myapps\speech-to-summary`:
   chunking por duración con ffmpeg y transcripción secuencial con contexto rodante.
3. **Los cambios en contrato, worker y migración SQL los hace el desarrollador del
   motor** (la tabla `analyses` y sus funciones pertenecen a la migración del motor,
   `ARQUITECTURA.md`). Detalle completo en `docs/SOLICITUD-UPDATE-MOTOR.md`.
4. **`options.publicContext: false` para audio**: no hay canal ni identidad pública
   que investigar. El score saldrá más seguido en banda `indeterminate`; es el
   comportamiento honesto y se refleja en el copy de la UI.
5. **El audio es transitorio**: vive en el bucket privado solo mientras se
   transcribe. El worker lo borra al reemplazar el input (éxito) o al fallo
   terminal. Tras la transcripción, la fila es indistinguible de una de YouTube
   salvo por `source.kind` y `origin: "speechToText"`.
6. **Reintentos sin re-transcribir**: al terminar la transcripción, el worker
   persiste el `AnalysisJobInput` de texto en `input`. Si el análisis falla después
   y se reintenta, el nuevo intento ya encuentra texto y salta la transcripción
   (mismo patrón del repo de referencia).

## Dependencias nuevas

- `ffmpeg-static` y `ffprobe-static` en `@motor/audio-transcription` (binarios
  portables; funcionan en el contenedor Linux de Railway y en Windows local).
- Cliente `openai` para `audio.transcriptions` (el worker ya tiene `OPENAI_API_KEY`).

## Requisito externo (bloqueante de las Fases 2–3)

El desarrollador del motor debe aplicar `docs/SOLICITUD-UPDATE-MOTOR.md`:
variante `voiceRecording` en el contrato, sobre de audio en la cola, etapa
`transcribing` en worker + migración. Las Fases 0 y 1 no dependen de él.

---

## Fase 0 — Paquete `@motor/audio-transcription` (Joel)

Crear `packages/audio-transcription` portando desde `d:\myapps\speech-to-summary`:

1. `src/chunking.ts` ← `lib/services/audio-chunking.service.ts`
   - Re-encodea + segmenta en una sola pasada de ffmpeg: 16kHz mono mp3, 32kbps,
     chunks de **300 s** (`-f segment`). Trocear por DURACIÓN, no por tamaño: la API
     de audio de OpenAI trunca inputs largos aunque pesen menos de 25MB.
   - Conservar los helpers puros (`buildSegmentArgs`, `computeBitrateKbps`,
     `parseFfprobeDuration`) **y sus tests** (adaptar de Jest a Vitest).
2. `src/transcribe.ts` ← lógica de `lib/services/transcription.service.ts`:
   - Transcripción **secuencial** chunk a chunk; el prompt de cada chunk lleva un
     contexto base + los últimos 2000 chars del transcript acumulado (consistencia
     de nombres propios entre cortes).
   - Contexto base: "grabación de voz de un usuario relatando afirmaciones a
     verificar" (no el de reuniones del original).
   - API: `transcribeAudio(buffer | path, { language, onProgress }): AudioTranscriptResult`
     con `{ language, segments, fullText, durationSeconds }`.
   - Segmentos listos para el contrato: `id: "segment-N"`,
     `startSeconds = índice * 300`, `endSeconds = min((índice+1)*300, duración)`,
     `confidence: null`.
   - Callback de progreso `(chunksListos, chunksTotales)` para mapear a la barra.
3. Manejo de temporales: `mkdtemp` del OS, limpieza en `finally` (patrón de
   `meeting-processor.service.ts` del repo de referencia).
4. El stub `lib/transcribe/audio.ts` de la web app se elimina o re-exporta el
   paquete (para el preview local si hiciera falta).

Verificación: `pnpm test` (tests de chunking en verde) + script manual que
transcribe un mp3/webm local de >6 min y muestra ≥2 segmentos coherentes.

## Fase 1 — Storage (Joel, coordinado con Jorge)

1. Bucket privado `analysis-audio` en Supabase (creación documentada o migración
   de storage). Solo lo tocan claves de servidor; nunca el navegador directo.
2. Límite de subida: `MAX_AUDIO_BYTES` (sugerido 50MB ≈ 1h de voz en webm/opus),
   validado en el endpoint.
3. Convención de ruta: `analysis-audio/{analysisId}.webm` para que el worker la
   derive sin columnas nuevas.

Verificación: subir/descargar/borrar un objeto con la clave de servidor local.

## Fase 2 — API web: variante `audio` (Joel; requiere update del motor)

1. `lib/schema.ts`: variante `{ sourceType: 'audio', outputLanguage? }` en
   `createAnalysisInput`. El audio llega como `FormData` (multipart), no JSON;
   el handler distingue por `content-type`.
2. `app/api/analyses/route.ts`, rama multipart:
   - Mismo `enforceRateLimit` por IP hasheada.
   - Valida tipo/tamaño del archivo.
   - Inserta la fila para obtener `id`, sube el blob a
     `analysis-audio/{id}.webm`, y deja `input` = **sobre de audio** del contrato
     actualizado (`kind: "audioPending"`, ruta del objeto, idioma) con
     `status: 'queued'`.
   - Responde `202` con la misma forma que YouTube; la UI redirige a
     `/analysis/{id}` sin cambios. **Ningún trabajo en background en la web.**
3. `lib/analysis-input.ts`: `buildAudioJobEnvelope(...)` (el sobre) — el
   `AnalysisJobInput` de texto lo construye el worker al transcribir.
4. `GET /api/analyses/[id]` + `lib/analysis-snapshot.ts`: tolerar la etapa
   `transcribing` y un `input` sin `source` de video (mostrar "Grabación de voz").
   No exponer la ruta del audio.

Verificación: `curl` multipart con audio corto → 202 → polling pasa por
`transcribing` → etapas del motor → diagnóstico completo, con el worker local
ya actualizado por el dev del motor.

## Fase 3 — UI: botón de grabación en la home (Joel)

1. Hook `hooks/use-voice-recorder.ts`: envuelve `MediaRecorder` —
   `getUserMedia({ audio: true })`, mimeType `audio/webm;codecs=opus` con fallback
   (`audio/mp4` en Safari), estados `idle | recording | stopped | denied`,
   cronómetro, límite duro configurable (sugerido 30 min), `Blob` final.
2. `components/create-analysis-form.tsx`: botón de micrófono junto a "Analizar"
   (mismo lenguaje visual Mantine y gradiente existente):
   - Grabando: indicador rojo pulsante (estética de `scan-pulses`), cronómetro,
     botón detener.
   - Al detener: mini-reproductor `<audio>` para revisar + "Analizar grabación" +
     descartar.
   - Envía `FormData` a `POST /api/analyses`; misma redirección a `/analysis/{id}`.
   - Permiso denegado → mensaje claro; el flujo de URL sigue intacto.
3. `i18n/dictionaries.ts`: textos es/en para grabar, detener, revisar, error de
   permisos, y nota de expectativa ("analizamos lo dicho; sin canal público el
   puntaje puede salir con menos cobertura").
4. `components/analysis-dashboard.tsx`: mapear `transcribing` a un paso visible
   ("Transcribiendo tu audio…") y ocultar la card de video/canal cuando el
   source es una grabación.

Verificación: flujo completo en Chrome y un navegador WebKit; grabación de
2–3 min analizada de punta a punta; `pnpm lint && pnpm typecheck && pnpm test`.

## Fase 4 — Endurecimiento y cierre (Joel)

1. Rate limit: evaluar un límite propio menor para audio (costo Whisper por minuto).
2. QA: audio >6 min (multi-chunk), audio con silencio, permiso denegado, archivo
   demasiado grande, es/en, reintento tras fallo de análisis (no re-transcribe).
3. Documentación: sección "Entrada por voz" en README y actualizar el flujo de
   `ARQUITECTURA.md` con la ruta de audio.

## Fuera de alcance (v1)

- Subir archivos de audio existentes (solo grabación en vivo; el endpoint queda
  listo para habilitarlo después).
- Diarización de hablantes, timestamps finos por palabra.

## Referencias

- Repo de referencia: `d:\myapps\speech-to-summary` →
  `lib/services/audio-chunking.service.ts`, `lib/services/transcription.service.ts`,
  `lib/services/meeting-processor.service.ts` (patrón de pipeline y limpieza).
- Solicitud al desarrollador del motor: `docs/SOLICITUD-UPDATE-MOTOR.md`.
- Convenciones respetadas: `ARQUITECTURA.md` (la web no ejecuta OpenAI; la tabla
  `analyses` pertenece a la migración del motor) y `PLAN-EDUARDO.md` (voz a texto
  es de Joel).
