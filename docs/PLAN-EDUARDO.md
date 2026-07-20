# Plan de trabajo de Eduardo — Motor de análisis

**Rama de trabajo:** `codex/motor-de-analisis`
**Responsable:** Eduardo
**Alcance:** motor multiagente, contrato de salida, investigación web, evaluación y documentación técnica.

## 1. Responsabilidad confirmada

Según la distribución acordada por el equipo, Eduardo es responsable de:

- Prompt engineering e integración con OpenAI API para el motor.
- Definición y validación del JSON de salida: índices, desglose, falacias con citas, resumen y métricas.
- Iteración con 5–6 videos reales hasta obtener clasificación consistente.
- Web research de afirmaciones y fuentes.
- Investigación pública complementaria del creador y su ecosistema.
- Redacción y ensamblado final de las partes técnicas del README relacionadas con el motor y la colaboración con Codex.

## 2. Qué construiremos en esta rama

```text
docs/
  PRD-motor-de-analisis.md
  PLAN-EDUARDO.md
  fixtures y evaluaciones del motor

src/engine/
  orquestación fan-out/fan-in
  síntesis y cálculo de métricas

src/agents/
  orchestrator
  discourse-analyst
  claim-researcher
  creator-context-researcher
  provenance-auditor
  evidence-judge

src/research/
  YouTube Data API
  web search y normalización de fuentes
  resolución de identidad pública

src/schemas/
  schemas Zod internos y respuesta pública
```

Las rutas son propuestas y se ajustarán a la estructura de Next.js que cree el equipo.

## 3. Límites con el trabajo de los demás

### Joel

Joel entrega o integra:

- Entrada UI y presentación del resultado.
- Voz a texto cuando corresponda.
- Adaptación visual al JSON acordado.

Eduardo entrega a Joel:

- Schema público simple y estable, separado del contrato interno auditable.
- Fixtures de alto, bajo, verificado, parcial y error.
- Estados de progreso y significado de cada campo.

### Jorge

Jorge entrega o integra:

- Arquitectura general, tablas, funciones, enums y rate limits.
- Extracción inicial del transcript de YouTube.
- Decisiones de despliegue e infraestructura compartida.

Eduardo entrega a Jorge:

- Estados requeridos por el worker.
- Artefactos internos por agente.
- Reglas de idempotencia, reintentos y presupuesto del motor.

No modificaremos UI, transcripción o infraestructura ajena salvo interfaces acordadas o bloqueos explícitos.

## 4. Orden de implementación

### Fase 1 — Contratos

1. Congelar request del motor.
2. Diseñar schemas internos por agente.
3. Diseñar la respuesta pública simple como consejero: contraste, explicación y próximos pasos.
4. Crear un adaptador determinista del JSON interno al JSON público.
5. Crear Zod y fixtures antes de programar prompts.

### Fase 2 — Análisis de contenido

1. Orquestador: segmentación, claims atómicas y prioridad.
2. Analista de discurso: falacias y señales retóricas con citas.
3. Canonicalización de citas y timestamps.
4. Síntesis sin web como primera entrega end-to-end.

### Fase 3 — Verificación factual paralela

1. Fan-out de 3 claims concurrentes.
2. Investigador web con evidencia estructurada.
3. Auditor de procedencia, deduplicación e independencia.
4. Árbitro independiente con abstención.
5. Fan-in idempotente y resultado `partial` ante timeout.

### Fase 4 — Contexto público del creador

1. Resolver identidad del canal.
2. Consultar últimos 5 videos con YouTube Data API.
3. Muestrear comentarios positivos, negativos y mixtos mediante API.
4. Buscar sitio, perfiles enlazados, empresa y comunidad pública.
5. Separar `creatorContext` y `audienceSignals` del veredicto factual.

### Fase 5 — Evaluación

1. Seleccionar 5–6 videos diversos.
2. Crear ground truth revisado por personas.
3. Medir precisión de citas, claims, evidencia, atribución y veredictos.
4. Medir costo, latencia y estabilidad entre corridas.
5. Corregir prompts y congelar versiones para la demo.

### Fase 6 — Integración y documentación

1. Entregar schema y fixtures a Joel.
2. Entregar estados y requisitos del worker a Jorge.
3. Probar el flujo completo en Railway.
4. Redactar la sección de Eduardo en README.

## 5. Definición de terminado

- Un enlace de YouTube genera un `runId` y progreso visible.
- Se extraen claims y señales retóricas con citas/timestamps exactos.
- Hasta 3 claims se investigan en paralelo y pasan por arbitraje independiente.
- Se consultan los últimos 5 videos y una muestra trazable de comentarios mediante YouTube Data API.
- Perfiles y comunidades solo se atribuyen con evidencia y nivel de confianza.
- El resultado separa contenido, verificación factual, contexto del creador y audiencia.
- Timeouts producen `partial`, no falsos `noEvidence`.
- Todo resultado público pasa Zod.
- Los 5–6 casos de evaluación quedan documentados.
- La UI puede consumir fixtures sin interpretar comentarios como prueba.

## 6. Restricciones obligatorias

- No afirmar que una persona miente ni inferir intención.
- No usar comentarios como prueba directa de fraude, calidad o veracidad.
- No scrapear YouTube o LinkedIn.
- No acceder ni copiar contenido privado de Skool.
- No recopilar datos personales innecesarios ni miembros de comunidades.
- No producir un score opaco de reputación.
