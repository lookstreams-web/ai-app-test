# Contrast AI

**Contrasta lo que se dice con evidencia disponible antes de actuar.**

Contrast AI analiza videos de YouTube y grabaciones de voz, identifica las afirmaciones
importantes, revisa señales de persuasión y busca evidencia pública para ofrecer un
diagnóstico sencillo, trazable y útil para tomar decisiones con mayor criterio.

El sistema evalúa el contenido y la evidencia disponible. No juzga la honestidad de una
persona, no convierte una afirmación incorrecta en una acusación de mentira y expresa la
incertidumbre cuando no existen fuentes suficientes.

Proyecto del equipo Eduardo, Joel y Jorge para OpenAI Build Week, julio de 2026.

## Qué ofrece

- Análisis de videos públicos de YouTube mediante sus subtítulos.
- Grabación de voz desde el navegador con consentimiento de las personas involucradas.
- Extracción de afirmaciones verificables con citas y timestamps.
- Revisión de marketing, urgencia, presión emocional y otras técnicas persuasivas.
- Investigación factual y de contexto público con fuentes favorables, neutrales y adversas.
- Auditoría de identidad, procedencia y duplicación de fuentes.
- Puntaje de alerta calculado en código, con cobertura e incertidumbre explícitas.
- Diagnóstico público en español o inglés, con contrastes, fuentes y recomendaciones.
- Reporte interno auditable y adaptador temporal al contrato v1.

Los comentarios positivos o negativos se consideran pistas, no hechos. Solo influyen cuando
existe corroboración independiente y nunca alteran el riesgo factual por cantidad o repetición.

## Cómo funciona

```text
Video de YouTube ─→ transcript segmentado ─┐
                                           ├─→ cola en Supabase
Grabación de voz ─→ Storage privado ───────┘         │
                                                     ▼
                            transcripción previa cuando existe audio
                                                     │
                                                     ▼
                 claims + discurso + investigación + auditoría de fuentes
                                                     │
                                                     ▼
                         arbitraje factual + scoring determinista
                                                     │
                                                     ▼
                    diagnóstico sencillo + reporte interno auditable
```

La API web prepara y encola el trabajo; no ejecuta OpenAI dentro de la solicitud. El worker
procesa la cola con leases, heartbeat, reintentos y timeout global. Para una grabación,
transcribe primero el audio, guarda el texto en la fila y elimina el archivo privado. Si el
análisis se reintenta, reutiliza el transcript y no vuelve a consumir la API de audio.

Las grabaciones usan `publicContext: false`: se analiza lo dicho y se pueden contrastar sus
afirmaciones, pero no se inventa una identidad o un canal público. Por eso su cobertura puede
ser menor que la de un video.

## Puntaje de alerta

El puntaje combina seis componentes:

| Categoría | Peso |
| --- | ---: |
| Riesgo factual | 30% |
| Manipulación y persuasión | 25% |
| Patrones entre videos | 15% |
| Transparencia | 10% |
| Riesgo público corroborado | 15% |
| Experiencias corroboradas | 5% |

La parte desconocida no recibe un cero inventado: reduce la cobertura y amplía el rango de
incertidumbre. No encontrar evidencia produce `insufficientEvidence`, nunca `contradicted`.

## Arquitectura

```text
app/                           UI Next.js y API HTTP
components/                    Formularios y dashboard del diagnóstico
hooks/                         Grabación de voz con MediaRecorder
apps/analysis-worker/          Cola, transcripción, análisis y health checks
packages/analysis-contracts/   Contratos Zod compartidos
packages/analysis-engine/      Agentes, procedencia, scoring y reportes
packages/audio-transcription/  ffmpeg, chunks y OpenAI Audio API
supabase/migrations/           Tablas, funciones y Storage privado
docs/                          PRD, metodología, contratos y fixtures
```

Stack principal: Next.js, Mantine UI, TypeScript, Zod, OpenAI Agents SDK, Supabase,
ffmpeg y Railway.

## API

### Analizar un video

```bash
curl -X POST http://localhost:3000/api/analyses \
  -H "Content-Type: application/json" \
  -d '{"sourceType":"youtube","url":"https://www.youtube.com/watch?v=VIDEO_ID","outputLanguage":"es"}'
```

### Analizar una grabación

```bash
curl -X POST http://localhost:3000/api/analyses \
  -F "audio=@grabacion.webm;type=audio/webm" \
  -F "language=es" \
  -F "outputLanguage=es"
```

El audio puede pesar hasta 50 MB. Se almacena temporalmente en el bucket privado
`analysis-audio` y se elimina después de la transcripción o de un fallo terminal.

### Consultar el resultado

```text
GET /api/analyses/{id}
```

El endpoint devuelve estado, progreso, fuente y diagnóstico público. No expone el transcript,
la ruta privada del audio ni el reporte interno. `error` solo contiene un fallo terminal cuando
`status` es `failed`; durante un reintento se mantiene en `null`.

Estados principales:

```text
queued → leased → transcribing? → analyzing → researching → adjudicating
       → scoring → synthesizing → completed | partial | needs_review | failed
```

## Resultados persistidos

1. `internal_report_v2`: reporte auditable con componentes, claims, evidencia y limitaciones.
2. `public_diagnosis`: explicación sencilla con porcentajes, contrastes, fuentes y consejo.
3. `legacy_v1_report`: compatibilidad temporal para videos, controlada por `EMIT_LEGACY_V1`.

Los porcentajes y las referencias a fuentes se construyen de forma determinista. El
sintetizador no puede inventar scores ni URLs.

## Configuración local

Requisitos: Node.js 22 o superior y pnpm 11.

```bash
pnpm install
cp .env.example .env
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
pnpm dev:worker
```

En PowerShell:

```powershell
Copy-Item .env.example .env
```

Variables esenciales:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` o `SUPABASE_SERVICE_ROLE_KEY`
- `RATE_LIMIT_SALT`
- `OPENAI_TRANSCRIBE_MODEL` — por defecto `gpt-4o-transcribe`

Nunca expongas claves de servidor al navegador ni subas `.env` al repositorio.

## Supabase

Aplica todas las migraciones antes de iniciar el worker:

```bash
supabase db push
```

Las migraciones crean la cola, sus funciones atómicas, el estado `transcribing` y el bucket
privado `analysis-audio` con límite de 50 MB y tipos de audio permitidos.

La cola usa por defecto:

- Lease de 120 segundos, renovado cada 30 segundos.
- Poll cada 2 segundos.
- Tres intentos con backoff.
- Un trabajo simultáneo por worker.
- Hasta tres investigaciones de afirmaciones en paralelo.

## Railway

El repositorio despliega dos servicios desde `main`:

| Servicio | Configuración | Inicio | Salud | Público |
| --- | --- | --- | --- | --- |
| `motor-web` | `/railway.web.json` | `pnpm start` | `GET /api/health` | Sí |
| `motor-worker` | `/railway.json` | `pnpm --filter @motor/analysis-worker start` | `GET /health` | No |

Ambos servicios usan `/` como root directory. Configura las variables de `.env.example`,
aplica primero las migraciones y permite que Railway inyecte `PORT` automáticamente.

## Verificación

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

La prueba live requiere claves de un entorno controlado. Para probar YouTube desde terminal:

```bash
pnpm test:youtube -- "https://www.youtube.com/watch?v=VIDEO_ID" --lang es
```

## Documentación

- [Contrato v1](CONTRATO.md)
- [PRD del motor](docs/PRD-motor-de-analisis.md)
- [Metodología del score](docs/METODOLOGIA-SCORE.md)
- [Contrato interno v2](docs/CONTRATO-SALIDA-V2.md)
- [Contrato público sencillo](docs/CONTRATO-PUBLICO-SIMPLE.md)
- [Arquitectura integrada](docs/ARQUITECTURA.md)
