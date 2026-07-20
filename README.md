# Motor de Verdad

Backend experimental para analizar un video de YouTube a partir de un transcript segmentado, contrastar sus afirmaciones con fuentes públicas y entregar un diagnóstico comprensible.

El motor evalúa el contenido y la evidencia disponible. No decide si una persona es honesta ni convierte una afirmación incorrecta en una acusación de mentira.

## Alcance de esta rama

Esta rama implementa solamente el backend de Eduardo:

- Contratos Zod compartidos para la entrada y las tres salidas.
- Motor de análisis multiagente con orquestación determinista.
- Investigación factual y de contexto público mediante web search.
- Auditoría de procedencia, arbitraje de claims y scoring en código.
- Worker de Supabase con leases, reintentos y persistencia atómica.
- Health checks y configuración para Railway.

No incluye la UI de Joel, el endpoint público de Next.js ni la extracción del transcript de YouTube de Jorge.

## Estructura

```text
apps/analysis-worker           Worker, cola, logs y health checks
packages/analysis-contracts   Schemas Zod compartidos
packages/analysis-engine      Agentes, evidencia, scoring y reportes
supabase/migrations           Tablas y funciones SQL atómicas
docs                          PRD, metodología, contratos y fixtures
```

## Flujo

```text
Joel inserta AnalysisJobInput en Supabase
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
pnpm dev:worker
```

En PowerShell, reemplaza `cp` por:

```powershell
Copy-Item .env.example .env
```

El worker requiere `OPENAI_API_KEY`, `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. Nunca expongas estas claves al navegador.

## Supabase

Aplica la migración antes de iniciar el worker:

```bash
supabase db push
```

Joel debe validar `analysisJobInputSchema` e insertar una fila en `analyses` con `status = 'queued'`. El worker no ofrece un endpoint para crear análisis.

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
