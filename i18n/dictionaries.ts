export type Locale = "es" | "en";

export const defaultLocale: Locale = "es";

export function isLocale(value: unknown): value is Locale {
  return value === "es" || value === "en";
}

const es = {
  header: {
    tagline: "Análisis con evidencia",
    newAnalysis: "Analizar otro video"
  },
  home: {
    metaTitle: "Veredicto — ¿Qué tan confiable es este video?",
    metaDescription:
      "Contrastamos las afirmaciones importantes de un video con fuentes disponibles y explicamos qué conviene revisar antes de decidir.",
    title: "Entiende qué tan confiable es un video antes de actuar.",
    subtitle:
      "Contrastamos las afirmaciones importantes con fuentes disponibles y explicamos qué conviene revisar.",
    steps: [
      {
        title: "Pega el enlace",
        detail: "Aceptamos videos públicos de YouTube con subtítulos disponibles."
      },
      {
        title: "Contrastamos con fuentes",
        detail:
          "Extraemos las afirmaciones importantes y las comparamos con evidencia pública. Tarda unos minutos."
      },
      {
        title: "Decide con contexto",
        detail:
          "Recibes un puntaje de alerta, señales de persuasión y consejos concretos antes de actuar."
      }
    ],
    disclaimer:
      "Veredicto analiza el contenido, no juzga a las personas. Los resultados son orientativos, dependen de la evidencia pública disponible y no constituyen asesoría profesional."
  },
  form: {
    title: "Analiza un video de YouTube",
    description:
      "Revisaremos lo que dice el video y las fuentes disponibles. El análisis no juzga a la persona creadora.",
    label: "Enlace del video",
    hint: "Pega un enlace público con subtítulos disponibles.",
    errorTitle: "No pudimos iniciar el análisis",
    defaultError: "No pudimos iniciar el análisis.",
    submit: "Analizar video"
  },
  dashboard: {
    metaTitle: "Veredicto — Diagnóstico del video",
    loadErrorTitle: "No pudimos cargar este análisis",
    queryError: "No pudimos consultar el análisis.",
    failedTitle: "El análisis no pudo completarse",
    failedFallback: "Inténtalo nuevamente con otro video.",
    preparingTitle: "Estamos preparando el diagnóstico",
    retryNote: "El intento anterior no se completó; lo estamos reintentando automáticamente.",
    stages: {
      queued: "En cola, comenzaremos en breve",
      leased: "Preparando el análisis",
      analyzing: "Analizando el contenido del video",
      researching: "Buscando evidencia en fuentes públicas",
      adjudicating: "Contrastando afirmaciones con la evidencia",
      scoring: "Calculando los puntajes",
      synthesizing: "Redactando el diagnóstico"
    } as Record<string, string>,
    humanReviewTitle: "Este diagnóstico requiere revisión humana",
    humanReviewBody:
      "Detectamos una contradicción importante o una posible acción oficial. No tomes decisiones basándote solo en el puntaje.",
    evidenceReviewedSuffix: "% de evidencia revisada",
    scoreTitle: "Puntaje de alerta",
    provisionalBadge: "Provisional",
    provisionalNote: "Revisión parcial: refleja únicamente lo que sí se pudo revisar.",
    noScore: "Sin puntaje",
    noScoreNote: "La evidencia revisada no alcanza para calcular un puntaje confiable.",
    scoreOutOf: "de 100",
    claimsTitle: "Afirmaciones importantes",
    claimSupported: "Respaldadas",
    claimNoContext: "Sin contexto",
    claimMismatch: "No coinciden",
    claimUnverified: "Sin comprobar",
    signalsTitle: "Señales de persuasión",
    signalContent: "Contenido con señales",
    signalUrgency: "Urgencia o presión",
    compositionTitle: "De qué está hecho el video",
    compositionPromotion: "Venta o promoción",
    compositionUseful: "Información útil",
    compositionBacked: "Información útil con respaldo",
    compositionUrgency: "Urgencia o presión",
    foundTitle: "Qué encontramos",
    cardContributes: "Lo que aporta",
    cardCareful: "Ten cuidado con",
    cardUnverified: "No pudimos comprobar",
    emptyCategory: "Nada que destacar en esta categoría.",
    contrastTitle: "Contraste de afirmaciones",
    contrastSubtitle: "Comparamos lo dicho con la evidencia disponible.",
    videoSays: "EL VIDEO DICE",
    weFound: "ENCONTRAMOS",
    viewSource: "Ver fuente",
    contextTitle: "Contexto público de la persona creadora",
    contextReviewed: "Qué revisamos:",
    contextPositive: "Lo positivo comprobado",
    contextAlerts: "Alertas comprobadas",
    contextOpinions: "Comentarios que solo son opiniones",
    adviceTitle: "Antes de decidir",
    questionsTitle: "Preguntas que puedes hacer",
    sourcesTitle: "Fuentes principales",
    levels: {
      bajo: "Bajo",
      moderado: "Moderado",
      medio: "Medio",
      precaucion_media: "Precaución media",
      alto: "Alto",
      "muy alto": "Muy alto",
      sin_conclusion: "Sin conclusión"
    } as Record<string, string>,
    conclusions: {
      coincide: "Coincide",
      coincide_en_parte: "Coincide en parte",
      falta_contexto: "Falta contexto",
      hay_desacuerdo_entre_fuentes: "Desacuerdo entre fuentes",
      no_coincide: "No coincide",
      no_se_pudo_comprobar: "No se pudo comprobar",
      todavia_no_se_puede_saber: "Todavía no se puede saber"
    } as Record<string, string>,
    techniques: {
      urgency: "Urgencia",
      scarcity: "Escasez",
      emotionalPressure: "Presión emocional",
      identityPressure: "Presión de identidad",
      authorityOrSocialProof: "Autoridad o prueba social",
      testimonialAsEvidence: "Testimonio como evidencia",
      certaintyEvidenceMismatch: "Certeza sin respaldo",
      falsePrecisionOrMissingDenominator: "Precisión engañosa",
      causalOverreach: "Causa-efecto exagerado",
      priceOrRiskFraming: "Encuadre de precio o riesgo",
      inoculationAgainstCritics: "Descalificación anticipada de críticas",
      falseDichotomy: "Falsa dicotomía",
      movingGoalposts: "Cambio de criterios"
    } as Record<string, string>
  }
};

export type Dictionary = typeof es;

const en: Dictionary = {
  header: {
    tagline: "Evidence-based analysis",
    newAnalysis: "Analyze another video"
  },
  home: {
    metaTitle: "Veredicto — How trustworthy is this video?",
    metaDescription:
      "We check a video's key claims against available sources and explain what deserves a closer look before you decide.",
    title: "Understand how trustworthy a video is before acting on it.",
    subtitle:
      "We check the key claims against available sources and explain what deserves a closer look.",
    steps: [
      {
        title: "Paste the link",
        detail: "We accept public YouTube videos with subtitles available."
      },
      {
        title: "We cross-check with sources",
        detail:
          "We extract the key claims and compare them with public evidence. It takes a few minutes."
      },
      {
        title: "Decide with context",
        detail: "You get an alert score, persuasion signals, and concrete advice before acting."
      }
    ],
    disclaimer:
      "Veredicto analyzes content; it does not judge people. Results are indicative, depend on publicly available evidence, and are not professional advice."
  },
  form: {
    title: "Analyze a YouTube video",
    description:
      "We'll review what the video says and the available sources. The analysis does not judge the creator.",
    label: "Video link",
    hint: "Paste a public link with subtitles available.",
    errorTitle: "We couldn't start the analysis",
    defaultError: "We couldn't start the analysis.",
    submit: "Analyze video"
  },
  dashboard: {
    metaTitle: "Veredicto — Video diagnosis",
    loadErrorTitle: "We couldn't load this analysis",
    queryError: "We couldn't fetch the analysis.",
    failedTitle: "The analysis could not be completed",
    failedFallback: "Try again with another video.",
    preparingTitle: "We're preparing the diagnosis",
    retryNote: "The previous attempt didn't finish; we're retrying automatically.",
    stages: {
      queued: "Queued, starting shortly",
      leased: "Preparing the analysis",
      analyzing: "Analyzing the video content",
      researching: "Searching public sources for evidence",
      adjudicating: "Checking claims against the evidence",
      scoring: "Calculating scores",
      synthesizing: "Writing the diagnosis"
    } as Record<string, string>,
    humanReviewTitle: "This diagnosis requires human review",
    humanReviewBody:
      "We detected a major contradiction or a possible official action. Don't make decisions based on the score alone.",
    evidenceReviewedSuffix: "% of evidence reviewed",
    scoreTitle: "Alert score",
    provisionalBadge: "Provisional",
    provisionalNote: "Partial review: it reflects only what could be verified.",
    noScore: "No score",
    noScoreNote: "The evidence reviewed isn't enough to calculate a reliable score.",
    scoreOutOf: "out of 100",
    claimsTitle: "Key claims",
    claimSupported: "Supported",
    claimNoContext: "Missing context",
    claimMismatch: "Contradicted",
    claimUnverified: "Unverified",
    signalsTitle: "Persuasion signals",
    signalContent: "Content with signals",
    signalUrgency: "Urgency or pressure",
    compositionTitle: "What the video is made of",
    compositionPromotion: "Sales or promotion",
    compositionUseful: "Useful information",
    compositionBacked: "Useful information with backing",
    compositionUrgency: "Urgency or pressure",
    foundTitle: "What we found",
    cardContributes: "What it contributes",
    cardCareful: "Be careful with",
    cardUnverified: "We couldn't verify",
    emptyCategory: "Nothing to highlight in this category.",
    contrastTitle: "Claim check",
    contrastSubtitle: "We compared what was said with the available evidence.",
    videoSays: "THE VIDEO SAYS",
    weFound: "WE FOUND",
    viewSource: "View source",
    contextTitle: "The creator's public context",
    contextReviewed: "What we reviewed:",
    contextPositive: "Verified positives",
    contextAlerts: "Verified warnings",
    contextOpinions: "Comments that are just opinions",
    adviceTitle: "Before you decide",
    questionsTitle: "Questions you can ask",
    sourcesTitle: "Main sources",
    levels: {
      bajo: "Low",
      moderado: "Moderate",
      medio: "Medium",
      precaucion_media: "Medium caution",
      alto: "High",
      "muy alto": "Very high",
      sin_conclusion: "No conclusion"
    } as Record<string, string>,
    conclusions: {
      coincide: "Matches",
      coincide_en_parte: "Partially matches",
      falta_contexto: "Missing context",
      hay_desacuerdo_entre_fuentes: "Sources disagree",
      no_coincide: "Contradicted",
      no_se_pudo_comprobar: "Couldn't be verified",
      todavia_no_se_puede_saber: "Too early to tell"
    } as Record<string, string>,
    techniques: {
      urgency: "Urgency",
      scarcity: "Scarcity",
      emotionalPressure: "Emotional pressure",
      identityPressure: "Identity pressure",
      authorityOrSocialProof: "Authority or social proof",
      testimonialAsEvidence: "Testimonial as evidence",
      certaintyEvidenceMismatch: "Certainty without evidence",
      falsePrecisionOrMissingDenominator: "False precision",
      causalOverreach: "Causal overreach",
      priceOrRiskFraming: "Price or risk framing",
      inoculationAgainstCritics: "Pre-empting critics",
      falseDichotomy: "False dichotomy",
      movingGoalposts: "Moving goalposts"
    } as Record<string, string>
  }
};

export const dictionaries: Record<Locale, Dictionary> = { es, en };
