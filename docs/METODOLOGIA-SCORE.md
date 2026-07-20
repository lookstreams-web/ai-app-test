# Metodología de scoring — Motor de Verdad

**Estado:** Diseño experimental v0.3
**Responsable:** Eduardo
**Unidad evaluada:** el contenido analizado y la evidencia pública disponible en una fecha de corte; no la honestidad, personalidad o valor moral del creador.

## 1. Decisión después de revisión adversarial

No se publicará un “score de verdad de la persona”. Por decisión de producto, sí se publicará un promedio ponderado de riesgos observables del contenido y su contexto público. En el contrato v2 se expone como `globalRisk.observedRiskScore`: **Índice global de riesgo informativo y persuasivo de la porción observada**.

Este score no es una probabilidad de mentira. Un valor alto significa que la suma de contradicciones, técnicas persuasivas, repetición histórica, falta de transparencia y señales públicas corroboradas justifica mayor cautela.

La UI mostrará el score final y su desglose:

- `globalRisk.observedRiskScore`: promedio ponderado de las categorías efectivamente observadas.
- `globalRisk.scoreCoverage`: porcentaje del peso global que pudo evaluarse.
- `globalRisk.uncertaintyRange`: mínimo y máximo compatibles con la parte desconocida.
- `factualRisk`: riesgo derivado de claims verificadas.
- `manipulationPersuasionRisk`: técnicas observables de manipulación y persuasión.
- `crossVideoPatternRisk`: repetición de claims y técnicas entre videos.
- `transparencyRisk`: ausencia de fuentes, metodología o disclosures aplicables.
- `corroboratedPublicRisk`: información pública adversa corroborada.
- `audienceEvidenceRisk`: experiencias públicas corroboradas, no sentimiento bruto.
- `verificationCoverage`: cuánto de lo verificable fue resuelto.
- `evidenceConfidence`: calidad e independencia de la evidencia.
- `audienceSignals`: temas de comentarios; no son votos de verdad.
- `scoreBand`: interpretación del número cuando la cobertura lo permite.
- `safetyOverride`: regla independiente que puede exigir cautela o revisión humana sin alterar el número.

## 2. Variables del tablero

| Variable | Qué mide | Uso |
| --- | --- | --- |
| `factualSupport` | Respaldo de claims atómicas resueltas | Origina `factualRisk` |
| `verificationCoverage` | Peso de claims verificables realmente resueltos | Condición para publicar el índice |
| `evidenceConfidence` | Directitud, calidad, ajuste e independencia | Controla resolución o abstención |
| `manipulationPersuasionRisk` | Urgencia, escasez, falsa certeza, presión emocional y otras técnicas | 25% del score final |
| `crossVideoPatternRisk` | Claims y técnicas repetidas entre fechas y videos | 15% del score final |
| `transparencyRisk` | Falta de fuentes, método, denominadores, conflictos o correcciones | 10% del score final |
| `corroboratedPublicRisk` | Incidentes, medidas o actuaciones públicas corroboradas | 15% del score final |
| `audienceEvidenceRisk` | Experiencias independientes que alcanzaron corroboración | 5% del score final |
| `audienceSignals` | Temas positivos, negativos y mixtos observados | Pistas y prioridad de investigación |
| `identityConfidence` | Correspondencia entre canal, persona, empresa y perfiles | Condición de atribución |
| `searchCoverage` | Fuentes y lugares consultados, inaccesibles y pendientes | Limitación visible |

La ausencia de LinkedIn, comunidad, comentarios o huella web no resta puntos. Se registra como `unavailable` o `notFound`, con su fecha y alcance de búsqueda.

## 3. Índice global de riesgo informativo y persuasivo

Todos los componentes usan la misma dirección: `0 = riesgo bajo` y `100 = riesgo alto`.

Los pesos fijos son 30, 25, 15, 10, 15 y 5 puntos respectivamente. Suman 100 y nunca se renormalizan silenciosamente.

El backend calcula el promedio; ningún LLM genera el número final. Cada componente debe incluir `score`, `coverage`, `confidence`, `contributions` y evidencias enlazadas.

Si un componente no está disponible, no recibe cero ni cincuenta. Para cada componente se usa su peso fijo `Wᵢ`, riesgo `Rᵢ` y cobertura efectiva `Cᵢ`:

```text
knownWeightPointsᵢ = Wᵢ × Cᵢ
knownRiskPointsᵢ   = Wᵢ × Cᵢ × Rᵢ / 100

knownWeightPoints   = Σ(knownWeightPointsᵢ)
knownRiskPoints     = Σ(knownRiskPointsᵢ)
missingWeightPoints = 100 - knownWeightPoints
scoreCoverage       = knownWeightPoints / 100
observedRiskScore   = 100 × knownRiskPoints / knownWeightPoints
uncertaintyRange    = [knownRiskPoints,
                       knownRiskPoints + missingWeightPoints]
```

### Reglas de publicación

- Emitir `observedRiskScore` provisional cuando exista al menos 5 % del peso global observado, 30 segundos analizables o la duración total si es menor, y un finding validado.
- Usar `score: null` con `insufficientData` cuando no se cumpla ese mínimo.
- Exigir `scoreCoverage >= 0.70` para una banda pública concluyente.
- Una promesa central no resuelta bloquea las bandas `low` y `moderateLow`, pero no elimina el número observado.
- Redondear al múltiplo de 5; no mostrar decimales.
- Mostrar `experimental`, cobertura, rango y fecha de corte.
- Una categoría con baja confianza puede mostrarse, pero no puede producir por sí sola una acusación categórica.

| Score | Riesgo global |
| --- | --- |
| 0–20 | Bajo |
| 21–40 | Moderado-bajo |
| 41–60 | Mixto |
| 61–80 | Alto |
| 81–100 | Muy alto |

### 3.1 Subíndice factual

```text
factualRisk = 100 - factualSupport
```

`factualRisk` no incluye sentimiento de comentarios, seguidores, likes o hechos no relacionados con los claims.

### Reglas de publicación

- Con `verificationCoverage < 0.60`, emitir solo el riesgo factual observado como provisional y ampliar el rango global.
- Si la promesa comercial central continúa sin resolver, impedir una banda pública baja.
- No usar perfiles o eventos externos para puntuar si la identidad no está `confirmed` con dos señales independientes.
- Si hay evidencia fuerte en ambos sentidos, usar `disputed`; no promediar el conflicto.
- Redondear al múltiplo de 5 más cercano; no mostrar decimales.
- Mostrar siempre `status: experimental|provisional|calibrated`.
- Mostrar score, cobertura, confianza, fecha de corte y claims de mayor impacto.
- `insufficientEvidence`, `disputed` y `notYetVerifiable` no valen 0 ni 50: quedan fuera del numerador y reducen cobertura.

### 3.2 Riesgo de manipulación y persuasión

Se calcula únicamente a partir de citas observables y contexto. La taxonomía inicial incluye:

- urgencia temporal y escasez artificial;
- miedo, culpa, aspiración o presión identitaria;
- falsa dicotomía;
- prueba social o autoridad como sustituto de evidencia;
- testimonios presentados como prueba estadística;
- certeza mayor que la evidencia disponible;
- promesas vagas o no falsables;
- falsa precisión y omisión de denominadores;
- cherry-picking y omisión de tasas base;
- causalidad exagerada;
- anclaje de precio y encuadre engañoso de riesgo;
- desacreditación preventiva de críticos;
- moving goalposts o cambio de criterio.

Cada finding contiene cita, timestamp, táctica, severidad, confianza y explicación. Varias tácticas sobre el mismo fragmento se agrupan para evitar doble conteo.

### 3.3 Patrones entre videos

El análisis de los últimos videos busca:

- la misma promesa sin evidencia repetida;
- cifras que cambian sin explicación;
- urgencia o escasez idéntica en fechas diferentes;
- testimonios reciclados;
- predicciones incumplidas o metas desplazadas;
- correcciones públicas o actualización responsable de datos;
- cambios reales de producto o periodo que expliquen diferencias.

La repetición de una técnica aumenta `crossVideoPatternRisk`. La repetición de un claim nunca demuestra que sea verdadero; aumenta su impacto y prioridad.

## 4. Cálculo por claim

Cada claim atómica recibe un peso entre 0 y 1:

```text
claimWeight =
    0.30 × centralidad en la promesa
  + 0.25 × daño potencial
  + 0.20 × capacidad de inducir una acción
  + 0.15 × especificidad verificable
  + 0.10 × alcance o repetición
```

La repetición aumenta la prioridad y el impacto de investigar el claim; jamás aumenta su veracidad.

Valores de claims resueltos:

```text
supported                  = 100
mostlySupported             = 75
misleadingMissingContext    = 35
contradicted                 = 0
```

```text
factualSupport =
  Σ(claimWeight × claimScore)
  / Σ(claimWeight de claims resueltos)

verificationCoverage =
  Σ(claimWeight de claims resueltos)
  / Σ(claimWeight de claims verificables)
```

Un claim solo se considera resuelto cuando el árbitro acepta que la evidencia cumple el umbral de calidad. La confianza del modelo no reemplaza ese umbral.

## 5. Calidad y procedencia de evidencia

No existe una jerarquía universal de dominios. Cada fuente se evalúa para el claim concreto:

- `authorityForThisClaim`
- `directness`
- `methodTransparency`
- `temporalFit`
- `geographicAndPopulationFit`
- `authenticity`
- `reproducibility`
- `conflictOfInterest`
- `independence`
- `proceduralStatus`

Ejemplos:

- Un registro empresarial demuestra inscripción, no calidad ni ausencia de fraude.
- Una demanda demuestra que existe una acusación, no que sea cierta.
- Una sentencia firme demuestra el resultado jurídico exacto, no todas las acusaciones sobre una persona.
- La web del creador demuestra qué prometió, qué precio publicó o qué política ofreció; no demuestra resultados.
- Un comentario demuestra que alguien publicó esa declaración; no demuestra que su experiencia ocurrió.

Cada evidencia debe conservar:

```json
{
  "id": "evidence-1",
  "originClusterId": "root-case-123",
  "sourceType": "regulatorFinalAction",
  "url": "https://...",
  "stance": "contradicts",
  "directness": 0.95,
  "temporalFit": 1,
  "proceduralStatus": "final",
  "conflictOfInterest": "noneKnown",
  "archivedAt": "2026-07-19T00:00:00Z",
  "contentHash": "sha256:..."
}
```

Diez URLs que copian el mismo documento comparten `originClusterId` y cuentan como un solo origen.

## 6. Comentarios positivos y negativos

Los comentarios generan `audienceSignals` y prioridad de investigación, no puntos de verdad.

### Proceso

1. Separar muestras ordenadas por recientes y relevantes.
2. Eliminar duplicados y near-duplicates.
3. Limitar el aporte a una señal por autor, tema y periodo.
4. Agrupar por incidente, no por cantidad de mensajes.
5. Detectar ráfagas, textos idénticos y patrones coordinados como `coordinationAnomaly`; no afirmar “bots” sin prueba.
6. Buscar corroboración fuera del comentario.
7. Conservar video, comentario, fecha, autor pseudonimizado, método de muestreo y limitaciones.

### Niveles de señal

| Nivel | Evidencia | Uso |
| --- | --- | --- |
| 0 | “Excelente” o “estafa” sin detalles | Sentimiento solamente |
| 1 | Relato específico sin comprobación | Pista |
| 2 | Fecha, producto y detalles consistentes | Pista prioritaria |
| 3 | Incidente con documento, transacción o respuesta empresarial | Caso corroborado |
| 4 | Casos independientes o actuación oficial relacionada | Patrón corroborado |

Para afirmar “patrón de experiencias” se exigen, inicialmente:

- Tres incidentes distintos y corroborados;
- autores diferentes;
- al menos dos periodos o contextos;
- ausencia de una única campaña/origen;
- o una actuación oficial final directamente relacionada.

La regla es simétrica:

- Un testimonio positivo corroborado demuestra una experiencia, no una tasa global de éxito.
- Una queja negativa corroborada demuestra un incidente, no fraude general.
- Cien mensajes iguales siguen siendo un cluster.
- Un documento oficial directo puede pesar más que cientos de opiniones.
- La ausencia de comentarios negativos nunca suma puntos.

### Score de prioridad, no de verdad

La repetición puede producir `investigationPriority` de 0 a 100:

```text
investigationPriority = clamp(
    specificity              0–25
  + uniqueIndependentReports 0–20, con crecimiento logarítmico
  + crossPlatformPresence    0–20
  + temporalSpread           0–15
  + corroborationAvailable   0–30
  - duplicationOrAnomaly     0–30,
  0, 100
)
```

Este número decide qué tema investigar primero. No entra directamente en `globalRisk.observedRiskScore`; solo los incidentes que después alcanzan corroboración pueden alimentar `audienceEvidenceRisk`.

## 7. Investigación web enriquecida

El buscador debe ejecutar consultas simétricas y guardar el log:

```text
nombre/empresa + claim concreto
nombre/empresa + metodología/resultados
nombre/empresa + review/testimonio
nombre/empresa + complaint/refund/support
nombre/empresa + regulator/sanction/investigation
nombre/empresa + lawsuit/judgment
nombre/empresa + registro empresarial/licencia
alias, marca, dominio, país e idioma
```

El snippet del buscador nunca es evidencia. El agente debe abrir la fuente y registrar la URL final, fecha, autor/editor, extracto y origen.

Fuentes a considerar:

- sitio oficial, términos, devoluciones y cambios de promesa;
- registros empresariales y profesionales;
- reguladores, autoridades de consumo y alertas públicas;
- expedientes judiciales públicos con estado procesal;
- prensa que enlace documentos y metodología;
- videos, podcasts y entrevistas anteriores con timestamp;
- landings y comunidades públicas;
- fact-checks existentes mediante Fact Check Tools API;
- plataformas de reseñas únicamente como señales de audiencia.

## 8. Evaluación global para la UI

La UI presenta el promedio ponderado y una regla determinista produce:

```text
scoreBand =
  low | moderateLow | mixed | high | veryHigh | indeterminate
```

Ejemplos de reglas:

- `insufficientData`: no existe el mínimo observable y el score es `null`.
- `veryHigh`: score 81–100 con cobertura suficiente.
- `high`: score 61–80 con cobertura suficiente.
- `mixed`: score 41–60 o desacuerdo importante entre dimensiones.
- `moderateLow`: score 21–40 con cobertura suficiente.
- `low`: score 0–20, cobertura alta y sin contradicción central pendiente.
- `indeterminate`: el número observado existe, pero la cobertura o una promesa central pendiente impiden interpretar una banda.

`safetyOverride` se muestra separado. Un claim central contradicho o una actuación oficial final puede exigir revisión humana sin reescribir silenciosamente el score ni la banda.

## 9. Contrato y ejemplos de salida

La estructura completa, los tres tipos de porcentajes, resúmenes ejecutivos, anexos de fuentes y reglas de validación se definen en [Contrato de salida v2](CONTRATO-SALIDA-V2.md).

- [Fixture completo](output-v2-completo.json)
- [Fixture provisional con información parcial](output-v2-provisional.json)

## 10. Controles y pruebas mínimas

1. Diez artículos copiados cuentan como un origen.
2. Quinientos comentarios idénticos no cambian el score factual.
3. Comentarios desactivados producen `unavailable`, no puntos positivos.
4. Un perfil homónimo no se atribuye.
5. Una demanda pendiente no aparece como condena.
6. Solo verificar claims fáciles bloquea el score por baja cobertura ponderada.
7. Evidencia fuerte en ambos sentidos genera `disputed`.
8. Búsqueda sin resultados genera `insufficientEvidence`.
9. Una queja resuelta conserva su resolución.
10. El sitio del creador no se trata como auditor independiente.
11. Un cambio real de producto o periodo no se marca automáticamente como contradicción.
12. Prompt injection en transcript, comentario o página queda aislado.

## 11. Calibración

Los 5–6 videos del hackathon sirven para validar el flujo, no para demostrar que el score está calibrado.

Antes de presentar el índice como defendible se requiere, como punto de partida:

- 150–200 claims atómicas diversas;
- dos revisores humanos y un árbitro;
- set de prueba separado;
- matriz de confusión y precisión por outcome;
- medición de cobertura y abstención;
- evaluación de calibración y variación;
- prioridad a minimizar falsos positivos en hallazgos dañinos;
- revisión humana antes de publicar acusaciones de alto impacto.

Hasta entonces se mostrará `status: "experimental"`.

## 12. Referencias metodológicas

- [IFCN Code of Principles](https://ifcncodeofprinciples.poynter.org/the-commitments)
- [Full Fact: cómo hacemos fact-checking](https://fullfact.org/about/how-we-fact-check/)
- [FTC: regla sobre reseñas y testimonios](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers)
- [Google Fact Check Tools API](https://developers.google.com/fact-check/tools/api/reference/rest/)
- [Google ClaimReview](https://developers.google.com/search/docs/appearance/structured-data/factcheck)
- [NIST AI RMF — Measure](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
