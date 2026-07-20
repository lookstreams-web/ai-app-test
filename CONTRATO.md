# Contrato de datos (v1)

Contrato entre el motor de análisis, el backend y la interfaz de usuario. Define el intercambio de datos para evaluar qué tan fundamentado o manipulador es un contenido.

Los JSON de `docs/` son la referencia humana de comportamiento. La fuente de verdad ejecutable será el schema de Zod; ante una discrepancia, prevalece el schema.

## Archivos de referencia

| Archivo | Propósito |
| --- | --- |
| `docs/output-alto-riesgo.json` | Ejemplo canónico de contenido con alto nivel de hype (`hypeIndex: 72`). Sirve como referencia para el prompt y la UI. |
| `docs/output-bajo-riesgo.json` | Caso de contraste con bajo hype (`hypeIndex: 14`). Evita que el análisis fuerce falacias en contenido razonable. |
| `docs/fixture-verification.json` | Fixture futuro para la UI con verificaciones completadas. No es una especificación del prompt: el LLM nunca genera `verification`. |

> Nota: los dos primeros archivos existen actualmente. El fixture de verificación se añadirá cuando se implemente esa etapa.

## Pipeline de producción

```text
1. LLM (GPT-5.6, structured outputs)
   └─ Genera el análisis y los findings, excepto `timestampSeconds` y `verification`.

2. Backend
   └─ Genera `meta` a partir de la fuente.
   └─ Localiza cada `quote` en el transcript mediante fuzzy match.
   └─ Añade `timestampSeconds` y reemplaza `quote` por el substring exacto encontrado.
   └─ Añade `verification: null` a cada finding.

3. Backend — segunda pasada (stretch)
   └─ Para cada finding `sourcedClaim` o `unsourcedClaim`, recupera evidencia
      mediante búsqueda web.
   └─ Opcionalmente llama a un segundo LLM con el claim y las fuentes recuperadas
      para evaluar la evidencia.
   └─ Construye y asigna `verification`: `{ status, note, sourceUrl }`.
   └─ Fusiona el resultado con el análisis usando `finding.id`.
```

Regla de oro: el LLM no debe generar información que el backend ya conoce ni datos anclados al mundo exterior: URL, duración, fecha de análisis, timestamps o evidencia web. `verification` no se genera en la primera llamada de análisis; solo se crea en la etapa opcional de verificación, orquestada por el backend y basada en evidencia web recuperada.

## Forma de la respuesta

```json
{
  "meta": {
    "schemaVersion": "1",
    "sourceType": "youtube",
    "sourceUrl": "https://youtube.com/watch?v=...",
    "title": "Título del contenido",
    "language": "es",
    "durationSeconds": 843,
    "model": "gpt-5.6",
    "analyzedAt": "2026-07-19T19:10:00Z"
  },
  "analysis": {
    "hypeIndex": 72,
    "verdict": "Mucha emoción, pocos datos",
    "breakdown": {
      "emotionalAppeal": 35,
      "fallacy": 12,
      "opinion": 10,
      "sourcedClaim": 6,
      "unsourcedClaim": 17,
      "neutral": 20
    },
    "findings": [],
    "executiveSummary": {
      "hasSubstance": "...",
      "mainConcerns": "...",
      "recommendation": "..."
    }
  }
}
```

### `verification`

`verification` no forma parte de la primera respuesta del LLM. Se crea únicamente en la etapa opcional de verificación: el backend recupera evidencia web y, si hace falta, puede solicitar a un segundo LLM que evalúe esas fuentes. El backend construye, valida y asigna el objeto final:

```json
{
  "status": "verified",
  "note": "Explicación breve del resultado.",
  "sourceUrl": "https://..."
}
```

| Campo | Valores / regla |
| --- | --- |
| `status` | `verified`, `contradicted` o `noEvidence` |
| `note` | Explicación breve del resultado de la comprobación. |
| `sourceUrl` | URL de respaldo o `null`. |

- `verification: null` significa que no se intentó verificar.
- `noEvidence` significa que se intentó verificar y no se encontró evidencia suficiente.
- Solo aplica a `sourcedClaim` y `unsourcedClaim`; para las demás categorías siempre es `null`.

## Invariantes

Estas reglas deben comprobarse en cada edición del contrato, schema o backend:

1. Cada `finding.category` debe existir como llave de `breakdown`: `emotionalAppeal`, `fallacy`, `opinion`, `sourcedClaim`, `unsourcedClaim` y `neutral`.
2. `neutral` nunca aparece como categoría de un finding; representa relleno sin contenido argumentativo.
3. Los valores de `breakdown` suman 100. Son una composición del discurso, no puntuaciones independientes.
4. Se usa `camelCase` en todas las llaves, categorías y tipos de falacia.
5. `quote` es texto literal del transcript tras la canonicalización del backend.
6. `hypeIndex` está entre 0 y 100; un valor mayor significa más humo, presión o falta de sustento.
7. Todos los findings contienen todos sus campos. Cuando un campo no aplica, se usa `null`; no se omite.

## Categorías y precedencia

Ante ambigüedad, se clasifica usando la primera categoría aplicable:

1. `fallacy`: argumento con una estructura lógica defectuosa.
2. `emotionalAppeal`: retórica cuyo propósito principal es provocar una emoción.
3. `unsourcedClaim`: afirmación empírica verificable, pero sin fuente citada.
4. `opinion`: juicio de valor que no es verificable en principio.
5. `sourcedClaim`: afirmación empírica con una fuente citada.
6. `neutral`: saludo, transición, narración o relleno sin contenido argumentativo.

Los tipos de falacia permitidos son: `falseDichotomy`, `artificialScarcity`, `appealToAuthority`, `hastyGeneralization`, `anecdotalEvidence`, `adHominem`, `slipperySlope` y `bandwagon`.

`severity` admite `high`, `medium`, `low` o `null`. Debe ser siempre `null` para `opinion` y `sourcedClaim`.

## Requisitos del schema de Zod

- Deben existir dos schemas: `analysisLlmSchema`, que excluye `timestampSeconds` y `verification`, y `responseSchema`, que valida la respuesta completa.
- `analysisLlmSchema` es un subárbol de `responseSchema`.
- El backend acepta una suma de `breakdown` entre 95 y 105 y la normaliza a 100; fuera de ese rango la rechaza.
- Una validación `superRefine` obliga a que `fallacyType` y `fallacyLabel` sean no nulos únicamente cuando `category === "fallacy"`.
- En `responseSchema`, `verification` solo puede ser no nulo para `sourcedClaim` y `unsourcedClaim`.
- `meta.durationSeconds` es `number | null`; debe ser `null` para `sourceType: "text"`.
- El prompt solicita los 8 a 12 findings más relevantes, no una lista exhaustiva.

## Pendientes

- [ ] Crear el schema de Zod.
- [ ] Acordar el formato de errores HTTP, por ejemplo: `{ "error": { "code", "message" } }`.
- [ ] Implementar la verificación web como etapa stretch.
