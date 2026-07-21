# Arquitectura integrada: Jorge + Eduardo

La app Next.js se encarga de recibir el enlace, obtener el transcript y crear el trabajo. El worker de Eduardo realiza el análisis multiagente de forma asíncrona.

## Flujo

```text
POST /api/analyses { sourceType: "youtube", url, outputLanguage?: "es" | "en" }
  → rate limit por IP hasheada
  → youtube-transcript + oEmbed
  → buildYoutubeAnalysisInput()
  → propaga options.outputLanguage a todos los agentes y adaptadores
  → validación con @motor/analysis-contracts
  → INSERT analyses(input, status = queued)
  → analysis-worker reserva el trabajo
  → análisis, investigación, arbitraje, scoring y síntesis
  → complete_analysis() guarda reporte interno, público y legacy
  → GET /api/analyses/{id} devuelve progreso y diagnóstico público
```

## Decisiones de integración

- La fuente de verdad ejecutable es `packages/analysis-contracts`; se retiró el segundo contrato Zod que duplicaba la salida v1.
- La API no ejecuta OpenAI dentro del request. Solo prepara y encola el trabajo para evitar timeouts y reintentos duplicados.
- La tabla `analyses` pertenece a la migración del motor. La migración `0001_init.sql` de la entrada web solo añade el rate limit.
- El rate limit usa un advisory lock por identificador para que la operación `count + insert` sea atómica ante solicitudes simultáneas.
- `GET /api/analyses/{id}` no expone `internal_report_v2` ni el transcript; entrega el diagnóstico público, el adaptador v1 y `source` con URL, título y canal para identificar y enlazar el video.
- El campo público `error` solo se completa cuando el estado es `failed`. Los errores internos conservados durante reintentos no se presentan como fallos terminales.

## Servicios en Railway

Se recomiendan dos servicios que comparten Supabase:

1. Web: `pnpm build:web` y `pnpm start`.
2. Worker: configuración existente en `railway.json`.

El web necesita las variables de Supabase, `RATE_LIMIT_*` y `NEXT_PUBLIC_APP_URL`. El worker necesita OpenAI, Supabase y las variables del motor. Las claves de servidor nunca se exponen con el prefijo `NEXT_PUBLIC_`.

## Límites actuales

- La extracción depende de subtítulos disponibles públicamente en YouTube.
- Artículos, texto pegado y audio todavía responden como fuente no implementada en el endpoint de análisis.
- El contexto de videos recientes y comentarios aún llega vacío; el contrato ya permite que Jorge lo incorpore después sin cambiar el worker.
- Las páginas incluidas son placeholders hasta integrar la UI de Joel.
