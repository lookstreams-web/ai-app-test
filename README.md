# Motor de Verdad

Backend experimental para analizar un video de YouTube a partir de un transcript segmentado, contrastar sus afirmaciones con fuentes públicas y entregar un diagnóstico comprensible.

El motor evalúa el contenido y la evidencia disponible. No decide si una persona es honesta ni convierte una afirmación incorrecta en una acusación de mentira.

## Alcance de esta rama

Esta rama integra el backend de Eduardo con la entrada y transcripción de Jorge:

- Contratos Zod compartidos para la entrada y las tres salidas.
- Motor de análisis multiagente con orquestación determinista.
- Investigación factual y de contexto público mediante web search.
- Auditoría de procedencia, arbitraje de claims y scoring en código.
- Worker de Supabase con leases, reintentos y persistencia atómica.
- Health checks y configuración para Railway.
- Endpoint Next.js que recibe una URL de YouTube, obtiene el transcript y encola el análisis.
- Endpoint de polling y preview de transcript, con rate limit por IP hasheada.

No incluye todavía la UI final de Joel. Las páginas Next.js incluidas son placeholders de integración.

## Estructura

```text
app                            Entrada HTTP y páginas placeholder
apps/analysis-worker           Worker, cola, logs y health checks
lib/youtube                    Extracción y adaptación del transcript de YouTube
packages/analysis-contracts   Schemas Zod compartidos
packages/analysis-engine      Agentes, evidencia, scoring y reportes
supabase/migrations           Tablas y funciones SQL atómicas
docs                          PRD, metodología, contratos y fixtures
```

## Flujo

```text
POST /api/analyses recibe una URL de YouTube
  → Jorge obtiene y segmenta el transcript
  → el adaptador valida AnalysisJobInput y lo encola en Supabase
  → worker reserva el trabajo con SKIP LOCKED
  → divide el transcript conservando timestamps
  → extrae claims y analiza el discurso
  → investiga contexto y hasta 3 claims en paralelo
  → deduplica fuentes y excluye identidades ambiguas
  → GPT-5.6 Sol arbitra cada claim sin buscar nuevamente
  → TypeScript calcula los seis componentes y la incertidumbre
  → plantillas generan el diagnóstico público
  → una transacción guarda v2, público y v1 temporal
```

Los comentarios positivos o negativos son pistas. Solo pueden influir en `audienceEvidenceRisk` cuando existe corroboración independiente; nunca cambian el riesgo factual por cantidad.

## Configuración local

Requisitos: Node.js 22 o superior y pnpm 11.

```bash
pnpm install
cp .env.example .env
pnpm typecheck
pnpm test
pnpm build
pnpm dev              # web en http://localhost:3000
pnpm dev:worker
```

En PowerShell, reemplaza `cp` por:

```powershell
Copy-Item .env.example .env
```

El worker y la API requieren `OPENAI_API_KEY`, `SUPABASE_URL` y una clave de servidor: `SUPABASE_SECRET_KEY` (recomendada) o `SUPABASE_SERVICE_ROLE_KEY` (legacy). Nunca expongas estas claves al navegador.

## Supabase

Aplica la migración antes de iniciar el worker:

```bash
supabase db push
```

La API valida `analysisJobInputSchema` e inserta una fila en `analyses` con `status = 'queued'`. El worker no ofrece un endpoint público para crear análisis.

Prueba rápida:

```bash
curl -X POST http://localhost:3000/api/analyses \
  -H "Content-Type: application/json" \
  -d '{"sourceType":"youtube","url":"https://www.youtube.com/watch?v=VIDEO_ID"}'
```

Consulta el progreso con `GET /api/analyses/{id}`.

Para una prueba local completa sin depender todavía del rate limit de la API web, inicia el worker y ejecuta en otra terminal:

```bash
pnpm dev:worker
pnpm test:youtube -- "https://www.youtube.com/watch?v=VIDEO_ID"
```

El comando muestra las etapas, el progreso y el diagnóstico público final. Encola directamente en el Supabase configurado en `.env`; úsalo solo para desarrollo.

La cola usa:

- Lease de 120 segundos, renovado cada 30 segundos.
- Poll cada 2 segundos.
- Tres intentos con backoff.
- Un trabajo simultáneo por worker.
- Tres investigaciones de claims en paralelo.

## Railway

El archivo `railway.json` compila y arranca `@motor/analysis-worker`.

- Inicio: `pnpm --filter @motor/analysis-worker start`
- Salud: `GET /health`
- Preparación: `GET /ready`

Configura las variables de `.env.example` en Railway y aplica primero la migración de Supabase. Este repositorio no despliega ni escribe secretos automáticamente.

## Resultados

El análisis guarda:

1. `internal_report_v2`: reporte auditable con componentes, claims, evidencia y limitaciones.
2. `public_diagnosis`: diagnóstico sencillo con porcentajes, tres contrastes y consejo.
3. `legacy_v1_report`: compatibilidad temporal controlada por `EMIT_LEGACY_V1`.

Los porcentajes públicos y todas las URLs se construyen en código. El sintetizador no puede inventarlos.

## Verificación

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

La prueba live queda fuera del conjunto normal y solo debe ejecutarse cuando existan claves de OpenAI y Supabase para un entorno no productivo.

## Documentación

- [Contrato v1](CONTRATO.md)
- [PRD del motor](docs/PRD-motor-de-analisis.md)
- [Metodología de score](docs/METODOLOGIA-SCORE.md)
- [Contrato interno v2](docs/CONTRATO-SALIDA-V2.md)
- [Contrato público sencillo](docs/CONTRATO-PUBLICO-SIMPLE.md)

Equipo: Eduardo, Joel y Jorge. Proyecto para OpenAI Build Week, julio de 2026.
