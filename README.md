# AI APP TEST

**Detector de humo para contenido digital.** Pega un enlace de YouTube o el texto de un artículo y la aplicación analiza el discurso con GPT-5.6 para identificar falacias, apelaciones emocionales y afirmaciones sin sustento.

El resultado no pretende decidir por ti: ofrece señales para evaluar el contenido con más criterio. Incluye un índice de hype de 0 a 100, un desglose de la composición del discurso, hallazgos con citas y timestamps, y un resumen ejecutivo.

Proyecto para la hackathon **OpenAI Build Week** (julio de 2026), track *Apps for Your Life*.

## Qué analiza

- **Falacias lógicas**, como falsas dicotomías, generalizaciones apresuradas o escasez artificial.
- **Apelaciones emocionales** que buscan persuadir mediante urgencia, miedo, aspiración o culpa.
- **Afirmaciones empíricas** con y sin fuente citada.
- **Opiniones** separadas de los datos verificables.

El `hypeIndex` va de **0 a 100**: un valor alto indica más señales de presión, exageración o falta de respaldo; no es una medida de verdad absoluta ni una recomendación financiera, médica o legal.

## Empieza por aquí

📄 **[CONTRATO.md](CONTRATO.md)** define el contrato de datos entre el motor de análisis, el backend y la UI. Léelo antes de escribir código: especifica quién produce cada campo, los invariantes del JSON, las categorías y los requisitos del schema de Zod.

Los ejemplos de salida están en [`docs/`](docs/):

| Archivo | Escenario |
| --- | --- |
| [`output-alto-riesgo.json`](docs/output-alto-riesgo.json) | Contenido con mucha emoción, urgencia y promesas sin evidencia (`hypeIndex: 72`). |
| [`output-bajo-riesgo.json`](docs/output-bajo-riesgo.json) | Contenido mayormente fundamentado y mesurado (`hypeIndex: 14`). |
| [`fixture-verification.json`](docs/fixture-verification.json) | Fixture de UI con los estados `verified`, `contradicted` y `noEvidence`. Representa la etapa de verificación posterior; no es la salida inicial del LLM. |

## Flujo del producto

```text
YouTube o texto → extracción de contenido → análisis estructurado →
canonicalización de citas y timestamps → resultados explicables en la UI
```

Como mejora posterior, el backend podrá verificar por separado las afirmaciones empíricas mediante búsqueda web. Esa comprobación no la genera el modelo y se integra por `finding.id`.

## Equipo

Eduardo, Joel y Jorge.

## Stack

- Next.js + Mantine UI
- OpenAI API — GPT-5.6 con structured outputs
- Zod
- Railway

## Estado

El repositorio contiene por ahora el contrato de datos y fixtures de salida. La implementación de la aplicación — endpoint, schemas, extracción de transcripts e interfaz — está pendiente.
