# Contrato público simple — Motor de Verdad

**Público:** personas sin experiencia técnica, incluyendo adolescentes.
**Función:** explicar, contrastar y aconsejar.
**Regla:** el JSON técnico se conserva dentro del motor; la UI solo recibe esta versión sencilla.

## 1. Idea principal

La respuesta pública debe contestar cinco preguntas, en este orden:

1. ¿Cuál es el diagnóstico final?
2. ¿Qué porcentaje de las afirmaciones coincide, es incorrecto o sigue sin comprobarse?
3. ¿En cuánto del contenido aparecen señales de posible manipulación o presión?
4. ¿Qué cosas útiles encontré?
5. ¿Qué me conviene hacer antes de creer, compartir o comprar?

No se muestran fórmulas, pesos internos, IDs técnicos, nombres de agentes ni métricas de programación.

## 2. Estructura pública

```text
diagnostico_final
resumen
contenido_del_video
contrastes[]
contexto_publico
consejo
fuentes_principales[]
avisos[]
```

### `diagnostico_final`

```json
{
  "titular": "ALERTA: 22 % de las afirmaciones importantes resultó incorrecto y detectamos señales de posible manipulación en 58 % del contenido.",
  "puntaje_de_alerta_pct": 55,
  "nivel": "precaucion_media",
  "afirmaciones": {
    "respaldadas_pct": 44,
    "incompletas_o_sin_contexto_pct": 18,
    "incorrectas_segun_fuentes_pct": 22,
    "sin_comprobar_pct": 16
  },
  "posible_manipulacion": {
    "contenido_con_senales_pct": 58,
    "urgencia_o_presion_pct": 20
  },
  "evidencia_revisada_pct": 87,
  "consejo_inmediato": "No decidas solo con este video. Comprueba la promesa principal y revisa las condiciones antes de pagar."
}
```

El diagnóstico debe abrir con el hallazgo más importante, usando lenguaje directo. Puede decir “incorrecto según las fuentes” cuando existe evidencia directa suficiente. No debe llamar “mentira” al contenido porque esa palabra afirma intención; el motor evalúa exactitud, no lo que la persona sabía o quería hacer.

Los cuatro porcentajes de `afirmaciones` suman 100. Las promesas principales cuentan más que los detalles menores; esta regla se explica con una frase, sin mostrar la fórmula.

`contenido_con_senales_pct` representa la parte del tiempo analizado donde apareció al menos una señal de presión o persuasión problemática. No es una probabilidad de que el creador quisiera manipular.

`evidencia_revisada_pct` indica cuánto del análisis previsto pudo completarse. Un diagnóstico con menos de 70 % debe titularse `RESULTADO PARCIAL` y evitar una conclusión general.

Niveles públicos:

| Puntaje | Nivel | Consejo base |
| --- | --- | --- |
| 0–20 | `bajo` | Puedes usarlo como referencia, pero abre las fuentes importantes. |
| 21–40 | `moderado` | Comprueba las promesas antes de repetirlas o actuar. |
| 41–60 | `medio` | No decidas solo con este video; compara información. |
| 61–80 | `alto` | Pausa la decisión y verifica las promesas principales. |
| 81–100 | `muy alto` | No actúes bajo presión; busca fuentes independientes y ayuda experta si aplica. |

Si falta mucha información, `nivel` será `sin_conclusion` aunque exista un puntaje provisional. El titular debe decir claramente qué faltó.

### `resumen`

Usa cuatro listas cortas:

- `en_pocas_palabras`: máximo tres oraciones.
- `lo_que_aporta`: hasta tres puntos útiles.
- `ten_cuidado_con`: hasta tres alertas observables.
- `no_pudimos_comprobar`: hasta tres asuntos pendientes.

Cada punto puede tener `fuentes`, pero la UI muestra únicamente un ícono o enlace “Ver fuente”.

### `contenido_del_video`

Este bloque explica la composición del video. Los porcentajes del diagnóstico factual no se repiten aquí:

```json
{
  "venta_o_promocion_pct": 38,
  "informacion_util_pct": 46,
  "informacion_util_con_respaldo_pct": 32,
  "urgencia_o_presion_pct": 20,
  "explicacion": "Los porcentajes describen el contenido revisado. Pueden superponerse y no tienen que sumar 100."
}
```

La UI debe acompañar cada número con una frase:

- Venta: “Parte del video dedicada a promocionar una oferta”.
- Información útil: “Explicaciones o pasos que pueden servirte”.
- Información con respaldo: “Información útil que además coincide con fuentes”.
- Urgencia: “Momentos que intentan acelerar tu decisión”.

### `contrastes`

Esta es la parte central del producto. Cada contraste se lee como una conversación:

```json
{
  "dice": "El 90 % de los alumnos obtiene resultados en 30 días.",
  "encontramos": "La fuente disponible muestra una cifra y un plazo diferentes.",
  "conclusion": "no_coincide",
  "explicacion": "La promesa usa un porcentaje que no aparece en la fuente consultada.",
  "momento_del_video": "05:02",
  "fuentes": ["fuente-1"]
}
```

Conclusiones permitidas:

- `coincide`
- `coincide_en_parte`
- `falta_contexto`
- `no_coincide`
- `hay_desacuerdo_entre_fuentes`
- `no_se_pudo_comprobar`
- `todavia_no_se_puede_saber`

Cuando `conclusion` es `no_coincide`, la explicación puede decir “esta afirmación es incorrecta según las fuentes consultadas”. No se usan en público las palabras “mentira”, “estafa”, “fraude” o “culpable” salvo que se cite con precisión una resolución oficial final y exista revisión humana.

### `contexto_publico`

Resume redes y web sin convertir popularidad en verdad:

```json
{
  "que_revisamos": ["YouTube", "sitio oficial", "LinkedIn público", "comunidad pública", "búsqueda web"],
  "lo_positivo_comprobado": [],
  "alertas_comprobadas": [],
  "comentarios_que_solo_son_opiniones": [],
  "explicacion": "Los comentarios visibles no representan a todos los clientes ni prueban por sí solos que algo ocurrió."
}
```

Un comentario positivo o negativo se muestra como opinión. Solo pasa a `lo_positivo_comprobado` o `alertas_comprobadas` cuando existe evidencia adicional independiente.

### `consejo`

El motor habla como un orientador, no como juez:

```json
{
  "recomendacion_principal": "No tomes una decisión solo con este video.",
  "por_que": "La promesa principal no coincide con la fuente consultada y el video usa urgencia cerca de la compra.",
  "antes_de_decidir": [
    "Pide la fuente original de la cifra.",
    "Lee las condiciones de devolución.",
    "Compara con una fuente independiente."
  ],
  "preguntas_que_puedes_hacer": [
    "¿Cuántas personas participaron?",
    "¿Qué significa exactamente obtener resultados?",
    "¿La oferta realmente termina hoy?"
  ]
}
```

Para salud, finanzas o asuntos legales se agrega: “No tomes una decisión importante solo con este análisis; consulta a un profesional calificado”.

## 3. Reglas de lenguaje

- Oraciones de máximo 22 palabras cuando sea posible.
- Una idea por oración.
- Explicar cualquier término poco común en la misma frase.
- Preferir “no coincide” sobre “contradicted”.
- Preferir “no pudimos comprobarlo” sobre “insufficient evidence”.
- Preferir “intenta apurar tu decisión” sobre “táctica de urgencia”.
- Preferir “información útil con respaldo” sobre “substantiated informational value”.
- Hablar sobre el video, la frase o la fuente; no juzgar la personalidad del creador.
- Diferenciar siempre observación, contraste y consejo.

## 4. Mapeo desde el JSON técnico

| Interno | Público |
| --- | --- |
| `globalRisk.observedRiskScore` | `diagnostico_final.puntaje_de_alerta_pct` |
| `globalRisk.scoreCoverage` | `diagnostico_final.evidencia_revisada_pct` |
| `supportedClaimWeightPct` | `diagnostico_final.afirmaciones.respaldadas_pct` |
| `misleadingClaimWeightPct` | `diagnostico_final.afirmaciones.incompletas_o_sin_contexto_pct` |
| `contradictedClaimWeightPct` | `diagnostico_final.afirmaciones.incorrectas_segun_fuentes_pct` |
| `unresolvedClaimWeightPct` | `diagnostico_final.afirmaciones.sin_comprobar_pct` |
| `techniqueExposurePct.anyPersuasion` | `diagnostico_final.posible_manipulacion.contenido_con_senales_pct` |
| `techniqueExposurePct.urgency` | `diagnostico_final.posible_manipulacion.urgencia_o_presion_pct` |
| `executiveSummaryGeneral` | `resumen.en_pocas_palabras` |
| `contentMixPct.marketingPromotion` | `contenido_del_video.venta_o_promocion_pct` |
| `candidateValuePct` | `contenido_del_video.informacion_util_pct` |
| `supportedValuePct` | `contenido_del_video.informacion_util_con_respaldo_pct` |
| `techniqueExposurePct.urgency` | `contenido_del_video.urgencia_o_presion_pct` |
| `claims[]` + `evidence` | `contrastes[]` |
| `creatorPublicContext` + `audienceSignals` | `contexto_publico` |
| `recommendations[]` | `consejo` |
| `sourceAppendix[]` | `fuentes_principales[]` |

## 5. Límites de tamaño

- Máximo 3 contrastes principales en la primera pantalla.
- Máximo 5 fuentes principales; el resto queda en “Ver todas”.
- Máximo 3 consejos antes de decidir.
- Máximo 3 preguntas sugeridas.
- Los detalles técnicos solo aparecen en una opción separada: “Cómo hicimos el análisis”.

El ejemplo completo de este contrato está en [output-publico-simple.json](output-publico-simple.json).
