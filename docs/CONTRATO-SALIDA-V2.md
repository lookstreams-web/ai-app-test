# Contrato de salida v2 — Motor de Verdad

**Estado:** propuesta ejecutable v0.3
**Responsable:** Eduardo
**Objetivo:** entregar un resultado útil aun cuando la información sea parcial, sin presentar un índice experimental como probabilidad de mentira ni convertir opiniones de internet en hechos.

Este es el contrato interno auditable. No debe enviarse directamente a una persona usuaria. Un adaptador determinista lo convierte al [contrato público simple](CONTRATO-PUBLICO-SIMPLE.md), escrito como contraste y consejo.

## 1. Qué responde el JSON

La salida separa preguntas que tienen denominadores distintos:

1. `globalRisk`: riesgo informativo y persuasivo del contenido y contexto analizados, expresado en puntos sobre 100.
2. `contentMixPct`: en qué se utilizó el tiempo transcrito observado; sus categorías son exclusivas y suman 100.
3. `claimOutcomeDistributionPct`: cómo se distribuye el peso de las afirmaciones verificables; suma 100 cuando existen claims elegibles.
4. `techniqueExposurePct`: qué proporción del tiempo observado estuvo expuesta a cada técnica; las técnicas se superponen y no tienen que sumar 100.
5. `actionableInformation`: cuánto contenido fue explicativo o accionable y cuánto conservó valor después de considerar especificidad, completitud y respaldo.

La UI debe decir `65/100 puntos de riesgo provisional`, nunca `65 % falso`. Para falsedad se publica la métrica acotada `contradictedClaimWeightPct`: porcentaje del peso de claims detectadas que terminó directamente contradicho.

## 2. Puntaje global con información parcial

Los pesos siempre suman 1 y no se renormalizan silenciosamente:

```text
factualRisk                    0.30
manipulationPersuasionRisk     0.25
crossVideoPatternRisk          0.15
transparencyRisk               0.10
corroboratedPublicRisk         0.15
audienceEvidenceRisk           0.05
```

Cada componente produce:

- `score` entre 0 y 100, calculado por código;
- `coverage` entre 0 y 1;
- `confidence` entre 0 y 1;
- `contributions`, con IDs de findings y evidencia;
- `formulaVersion`.

Con peso porcentual fijo `Wᵢ`, score `Rᵢ` y cobertura `Cᵢ`:

```text
knownWeightPointsᵢ = Wᵢ × Cᵢ
knownRiskPointsᵢ   = Wᵢ × Cᵢ × Rᵢ / 100

knownWeightPoints   = Σ(knownWeightPointsᵢ)
knownRiskPoints     = Σ(knownRiskPointsᵢ)
missingWeightPoints = 100 - knownWeightPoints
scoreCoverage       = knownWeightPoints / 100
observedRiskScore   = 100 × knownRiskPoints / knownWeightPoints
uncertaintyMin      = knownRiskPoints
uncertaintyMax      = knownRiskPoints + missingWeightPoints
```

`observedRiskScore` es el número principal solicitado: el promedio de riesgo en la porción ponderada realmente observada. La parte desconocida no recibe un prior ni se presenta como resultado; queda representada por `missingWeightPoints` y `uncertaintyRange`. Cuando `scoreCoverage = 1`, el score y ambos extremos del rango coinciden.

Todos los valores visuales se redondean al múltiplo de 5; los valores crudos se conservan para auditoría.

### Estados

| Estado | Regla |
| --- | --- |
| `insufficientData` | No existe el mínimo de contenido observable; el score es `null`. |
| `provisional` | Existe contenido analizable, pero `scoreCoverage < 0.70`, la promesa central está sin resolver o falta una fuente crítica. |
| `publishableExperimental` | Cobertura ≥ 0.70, claim central resuelto, atribución suficiente y sin conflicto crítico pendiente. |
| `humanReviewRequired` | Dominio sensible, contradicción grave, sanción/juicio, conflicto central o riesgo de daño reputacional. |

El mínimo observable exige todas estas condiciones:

```text
sourceAccessible = true
AND analyzableDuration >= min(videoDuration, 30 segundos)
AND validatedFindingCount >= 1
AND knownWeightPoints >= 5
```

Si el video está caído o privado, no hay transcript utilizable y tampoco existe contenido analizable, `observedRiskScore` debe ser `null`. Un prior no es un resultado.

### Banda y override de seguridad

`scoreBand` solo interpreta el número: `low`, `moderateLow`, `mixed`, `high`, `veryHigh` o `indeterminate`. `safetyOverride` es independiente y puede exigir revisión humana sin cambiar el score.

Una promesa central `disputed`, `insufficientEvidence` o `notYetVerifiable` bloquea las bandas `low` y `moderateLow`; el valor numérico se conserva, pero la banda pública pasa a `indeterminate`.

## 3. Porcentajes que verá Eduardo y la UI

### 3.1 Mezcla del contenido observado

El transcript se divide en intervalos no superpuestos. Cada segundo observado recibe exactamente una categoría primaria:

- `marketingPromotion`: CTA, pitch, oferta, precio, captación, venta o autopromoción;
- `substantiveExplanation`: explicación de conceptos, mecanismos o contexto;
- `actionableGuidance`: pasos concretos que el usuario podría ejecutar;
- `opinionPersonalNarrative`: opinión, historia personal o motivación;
- `neutralOther`: saludo, transición, cierre u otro contenido.

```text
categoryPct = 100 × observedSecondsInCategory / totalObservedClassifiedSeconds
```

Las cinco categorías deben sumar 100 ± 0.1. La UI rotula: “porcentaje del contenido transcrito observado”. `mediaDurationCoverage` aclara cuánto del video real fue medido.

### 3.2 Información de valor

`candidateValuePct` es la suma temporal de `substantiveExplanation` y `actionableGuidance`. No significa que el contenido sea verdadero.

Cada segmento candidato recibe una rúbrica 0–1:

```text
segmentUtility =
    0.25 × specificity
  + 0.25 × actionability
  + 0.20 × completeness
  + 0.10 × contextualNovelty
  + 0.20 × evidenceBacking
```

Los criterios son ordinales y se convierten por código: `none=0`, `weak=0.25`, `medium=0.50`, `strong=0.75`, `complete=1`.

```text
supportedValuePct =
  100 × Σ(candidateSegmentSeconds × segmentUtility)
  / totalObservedClassifiedSeconds
```

Se publican ambos números: uno mide cantidad candidata y el otro calidad ajustada. Un consejo accionable contradicho puede tener alta accionabilidad, pero `evidenceBacking=0` y una recomendación de no aplicarlo sin verificación.

### 3.3 Resultado de afirmaciones

El denominador es el peso de todas las claims verificables elegibles detectadas, no solo las elegidas para web research:

```text
outcomePct = 100 × Σ(claimWeight del outcome) / Σ(claimWeight elegible)
```

Outcomes:

- `supported`
- `mostlySupported`
- `misleadingMissingContext`
- `contradicted`
- `disputed`
- `insufficientEvidence`
- `notYetVerifiable`

La distribución suma 100 ± 0.1. Si no existen claims verificables, el bloque usa `status: "notApplicable"` y porcentajes `null`; nunca se interpreta como 0 % falso o 100 % verdadero.

La UI puede mostrar:

- `contradictedClaimWeightPct`: partes directamente contradichas;
- `misleadingClaimWeightPct`: partes ciertas o plausibles, pero engañosas por contexto;
- `unresolvedClaimWeightPct`: `disputed + insufficientEvidence + notYetVerifiable`;
- `supportedClaimWeightPct`: `supported + mostlySupported`.

### 3.4 Exposición a técnicas

Cada técnica se calcula por la unión temporal de sus intervalos:

```text
techniquePct = 100 × uniqueObservedSecondsWithTechnique / totalObservedClassifiedSeconds
```

Campos iniciales:

- `anyPersuasion`
- `urgency`
- `scarcity`
- `emotionalPressure`
- `identityPressure`
- `authorityOrSocialProof`
- `testimonialAsEvidence`
- `certaintyEvidenceMismatch`
- `falsePrecisionOrMissingDenominator`
- `causalOverreach`
- `priceOrRiskFraming`
- `inoculationAgainstCritics`

Una frase puede activar varias técnicas; por eso sus porcentajes no suman 100.

## 4. Reglas deterministas por componente

El modelo identifica unidades estructuradas; el backend calcula. Ningún agente escribe directamente un score final.

### `factualRisk`

```text
claimScore:
  supported                 100
  mostlySupported            75
  misleadingMissingContext   35
  contradicted                0

factualSupport = Σ(resolvedClaimWeight × claimScore) / Σ(resolvedClaimWeight)
factualRisk    = 100 - factualSupport
coverage       = Σ(resolvedClaimWeight) / Σ(eligibleClaimWeight)
```

`disputed`, `insufficientEvidence` y `notYetVerifiable` no reciben 0 ni 50: reducen cobertura y amplían el rango global.

### `manipulationPersuasionRisk`

El agente entrega táctica, intervalo, severidad ordinal y confianza. El backend agrupa intervalos duplicados. Cada táctica tiene un peso versionado `baseImpact`; la severidad se convierte `low=.25`, `medium=.50`, `high=.75`, `critical=1`.

```text
segmentPressure = 100 × (1 - Π(1 - baseImpact × severity × confidence))
manipulationPersuasionRisk =
  Σ(segmentDuration × segmentPressure) / Σ(analyzedDuration)
coverage = classifiedObservedSeconds / usableTranscriptSeconds
```

Varias etiquetas del mismo fragmento no crean varios intervalos temporales ni varios findings primarios.

### `crossVideoPatternRisk`

Se agrupa por `patternKey`. Solo se llama `recurrent` con al menos tres ocurrencias independientes, dos videos y dos periodos; con menos, es `emerging`.

```text
recurrenceFactor = min(1, independentOccurrences / 3)
                 × min(1, distinctPeriods / 2)
patternContribution = 100 × underlyingFindingRisk × recurrenceFactor
crossVideoPatternRisk = 100 × (1 - Π(1 - patternContribution / 100))
coverage = Σ(transcriptCoverage de videos analizados) / plannedVideoCount
```

Los últimos cinco videos se rotulan `recentSamplePattern`; no representan toda la historia. Cuando sea posible se agrega una muestra histórica estratificada.

### `transparencyRisk`

Para cada claim central se generan checks aplicables: fuente, método, denominador, fecha/periodo, población, conflicto comercial, correcciones y, cuando corresponda, términos/devolución. Cada check tiene peso versionado.

```text
checkRisk: present=0, partial=0.5, missing=1
transparencyRisk = 100 × Σ(checkWeight × checkRisk) / Σ(applicableCheckWeight)
coverage = inspectedApplicableCheckWeight / totalApplicableCheckWeight
```

Una red social inexistente no es un check de transparencia y no resta puntos.

### `corroboratedPublicRisk`

Solo acepta eventos externos con identidad `confirmed`, relación directa y origen corroborado. Una acusación pendiente conserva su estado y nunca se presenta como sentencia.

```text
proceduralMultiplier:
  finalJudgment/finalSanction = 1.00
  settlementWithAdmission     = 0.80
  settlementWithoutAdmission  = 0.50
  interimOrder                = 0.40
  formalInvestigation         = 0.20
  complaint/allegation        = 0.00
  dismissed                   = 0.00

eventRisk = severity × directness × relevance × evidenceQuality
          × temporalFit × proceduralMultiplier
corroboratedPublicRisk = min(100, max(eventRisk)
                           + 0.25 × Σ(otherIndependentEventRisk))
coverage = completedWeightedSearchTargets / plannedWeightedSearchTargets
```

Los eventos se deduplican por `originClusterId`. Experiencias positivas corroboradas se muestran separadas y no cancelan matemáticamente una sanción; una sanción tampoco borra experiencias positivas.

### `audienceEvidenceRisk`

Los comentarios brutos no puntúan. Solo entran incidentes de nivel 3 o 4, independientes y corroborados, con tope por origen.

```text
incidentContribution = 100 × harmSeverity × corroborationLevel
                           × independence × relevance × unresolvedFactor
audienceEvidenceRisk = 100 × (1 - Π(1 - incidentContribution / 100))
coverage = completedCorroborationWeight / selectedSignalWeight
```

Una queja resuelta conserva `resolutionStatus` y recibe menor `unresolvedFactor`. La proporción positiva/negativa de comentarios se publica únicamente como `observedSampleShare`, con denominador y `prevalenceInferenceAllowed: false`.

## 5. Investigación del ecosistema público

La investigación parte de enlaces controlados por el canal y sigue un máximo de dos saltos. Una identidad se marca `confirmed` solo con dos señales independientes de atribución; un homónimo `ambiguous` no contribuye a scores.

El `searchPlan` registra:

- versión, fecha de corte, países e idiomas;
- alias, marca, dominio y enlaces declarados;
- YouTube y muestra de videos recientes;
- sitio oficial, página de venta, términos y devolución;
- perfiles profesionales y comunidades públicas atribuibles;
- búsqueda web general;
- registros empresariales, profesionales, judiciales o regulatorios pertinentes;
- consultas favorables y adversas simétricas;
- presupuesto, criterio de parada y accesos fallidos.

Estados de acceso: `completed`, `partial`, `restricted`, `unavailable`, `notFound`, `notApplicable`. Los cuatro últimos no aportan cero riesgo; reducen cobertura.

LinkedIn y comunidades cerradas se consultan solo por vías públicas o autorizadas. YouTube se consulta mediante su API, no raspando sus páginas.

## 6. Estructura pública del JSON

```text
meta
input
globalRisk
executiveSummaryGeneral
categorySummaries[]
contentMetrics
keyFindings[]
claims[]
persuasionFindings[]
recentSamplePatterns[]
creatorPublicContext
audienceSignals
sourceAppendix[]
recommendations[]
limitations[]
runTrace
```

### Resumen ejecutivo general

Debe contener:

- `headline`;
- `summary`;
- interpretación del puntaje, cobertura y rango;
- balance de marketing, valor, contradicción, no resuelto y urgencia;
- `topFindingRefs`, `claimRefs`, `sourceRefs`, `recommendationRefs` y `limitationRefs`.

El sintetizador solo puede usar findings aprobados. Cada oración factual debe ser reconstruible desde las referencias; anexar enlaces al final sin correspondencia no es suficiente.

### Resumen por categoría

`categorySummaries` contiene exactamente las seis categorías del score. Cada elemento incluye `category`, `score`, `coverage`, `status`, `headline`, `summary`, `findingRefs`, `claimRefs`, `sourceRefs` y `recommendationRefs`.

### Hallazgos principales

Cada `keyFinding` incluye:

- afirmación breve y alcance preciso;
- `primaryComponent` y `secondarySignals` para impedir doble conteo;
- cita original y traducción opcional;
- timestamp o intervalo;
- outcome, severidad, confianza y estado de revisión;
- referencias a claims, fuentes y recomendaciones.

“Contradicho” se usa solo para una claim atómica con evidencia directa suficiente. `insufficientEvidence` jamás se redacta como falso.

### Fuentes anexas

Cada fuente incluye:

- URL final y título;
- editor/autor y tipo;
- fecha de publicación, fecha efectiva y fecha de consulta;
- extracto breve;
- postura frente a la claim;
- `originClusterId` para deduplicar copias;
- calidad, directitud, independencia, conflicto de interés y estado procesal;
- IDs de claims/findings que respalda.

### Recomendaciones

Cada recomendación se vincula a findings y fuentes. Debe proponer una acción de verificación concreta: solicitar metodología, contrastar fuente primaria, revisar términos, esperar confirmación o consultar a un profesional. No debe acusar a una persona ni ordenar decisiones tajantes basadas en señales no verificadas.

## 7. Invariantes de validación

El schema/Zod y las pruebas deben rechazar una salida si:

1. Los pesos globales no suman 1.
2. `contentMixPct` no suma 100 ± 0.1.
3. Una distribución factual aplicable no suma 100 ± 0.1.
4. Un porcentaje queda fuera de 0–100 o una cobertura fuera de 0–1.
5. `knownWeightPoints + missingWeightPoints != 100` dentro de tolerancia.
6. `uncertaintyRange.min != knownRiskPoints` o su máximo no coincide con `knownRiskPoints + missingWeightPoints`.
7. `observedRiskScore` no coincide con la fórmula dentro de una tolerancia de 0.1.
8. `status=insufficientData` contiene cualquier score numérico.
9. `status=provisional` omite cobertura, rango o motivo.
10. Una claim `contradicted` carece de evidencia directa y fuente.
11. Una claim no resuelta aparece en el resumen como falsa.
12. Una fuente externa carece de URL, fecha de consulta u `originClusterId`.
13. Dos fuentes del mismo origen cuentan como evidencia independiente.
14. Un perfil `ambiguous` aporta a cualquier componente.
15. Comentarios brutos modifican `factualRisk`.
16. `prevalenceInferenceAllowed=false` se resume como porcentaje de clientes o de toda la audiencia.
17. Un finding primario aporta puntos completos a más de un componente.
18. Un resumen o recomendación referencia IDs inexistentes.
19. Una cita crítica no fue verificada contra audio o transcript alternativo.
20. Un acceso `restricted`, `unavailable` o `notFound` se convirtió en score cero.

## 8. Casos adversariales mínimos

1. Video privado y sin transcript → `insufficientData`, score `null`.
2. Video motivacional sin claims → factual no aplicable, score retórico provisional y rango amplio.
3. Promesa central no resuelta y claim menor verdadero → banda `indeterminate`, nunca bajo riesgo.
4. Diez artículos copiados → un solo `originClusterId`.
5. Quinientos comentarios idénticos → un cluster; no cambian riesgo factual.
6. Comentarios desactivados → `unavailable`, no señal positiva.
7. Perfil de LinkedIn homónimo → `ambiguous`, excluido del score.
8. Demanda pendiente → se describe como alegación/proceso, no condena.
9. Evidencia fuerte en ambos sentidos → `disputed` y rango más amplio.
10. Claim técnicamente cierto sin denominador → `misleadingMissingContext`.
11. Cinco videos de una misma campaña → patrón reciente, no historia general.
12. Transcript automático cambia una cifra → verificación contra audio antes de contradicción.
13. Prompt injection dentro de video, comentario o web → tratado como dato, nunca instrucción.
14. Queja resuelta y reembolsada → conserva resolución y reduce riesgo residual.
15. Búsqueda sin resultados → `insufficientEvidence`, nunca `contradicted`.

## 9. Compatibilidad con UI

La tarjeta principal muestra:

```text
Riesgo observado provisional: 65/100
Cobertura del score: 40 %
Rango global compatible: 26–86
Estado: no concluyente
```

Debajo se muestran, sin promediarlos entre sí:

```text
Marketing/promoción: 42 % del contenido observado
Información candidata de valor: 38 %
Valor ajustado por calidad y respaldo: 21 %
Claims contradichas: 18 % del peso de claims
Claims no resueltas: 35 % del peso de claims
Urgencia: 24 % del tiempo observado
```

El contrato completo de ejemplo está en `output-v2-completo.json` y el caso de información limitada en `output-v2-provisional.json`.
