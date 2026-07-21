export type Locale = "es" | "en";

export const defaultLocale: Locale = "es";

export function isLocale(value: unknown): value is Locale {
  return value === "es" || value === "en";
}

const es = {
  header: {
    tagline: "Análisis con evidencia",
    newAnalysis: "Nuevo análisis"
  },
  home: {
    metaTitle: "Contrast AI — ¿Qué tan confiable es este contenido?",
    metaDescription:
      "Contrastamos las afirmaciones importantes de un video o una grabación con fuentes disponibles y explicamos qué conviene revisar antes de decidir.",
    title: "Entiende qué tan confiable es un video o una grabación antes de actuar.",
    subtitle:
      "Contrastamos las afirmaciones importantes con fuentes disponibles y explicamos qué conviene revisar.",
    visualOr: "o",
    visualRecording: "Grabando",
    visualConclusion: "Coincide en parte",
    visualSays: "El contenido dice",
    visualFound: "Encontramos",
    visualViewSource: "Ver fuente",
    methodology: {
      title: "Cómo funciona el análisis",
      items: [
        {
          title: "Leemos lo que se dice",
          detail:
            "Usamos los subtítulos del video o la transcripción de tu grabación e identificamos las afirmaciones importantes que se pueden comprobar."
        },
        {
          title: "Buscamos evidencia pública",
          detail:
            "Contrastamos cada afirmación con fuentes disponibles: medios, organismos oficiales y documentación pública."
        },
        {
          title: "Calculamos el puntaje de alerta",
          detail:
            "Un puntaje más alto significa más precaución. Sumamos señales de persuasión como urgencia o presión emocional."
        }
      ],
      limitsTitle: "Ten en cuenta",
      limits:
        "El análisis depende de la evidencia pública disponible en el momento y puede quedar incompleto o desactualizado."
    }
  },
  form: {
    title: "Analiza un video de YouTube",
    description:
      "Revisaremos lo que dice el video y las fuentes disponibles. El análisis no juzga a la persona creadora.",
    label: "Enlace de YouTube",
    hint: "Pega un enlace público con subtítulos disponibles.",
    errorTitle: "No pudimos iniciar el análisis",
    defaultError: "No pudimos iniciar el análisis.",
    submit: "Analizar video",
    audio: {
      record: "Iniciar grabación",
      recording: "Grabando",
      stop: "Detener",
      reviewTitle: "Revisa tu grabación",
      analyze: "Analizar grabación",
      discard: "Descartar",
      permissionDenied:
        "No pudimos acceder al micrófono. Revisa los permisos del navegador; también puedes analizar un enlace de YouTube.",
      unsupported: "Tu navegador no permite grabar audio. Prueba con un enlace de YouTube.",
      note: "Asegúrate de tener permiso de las personas involucradas antes de grabar.",
      limitReached: "Alcanzaste el límite de 30 minutos de grabación."
    }
  },
  preview: {
    exampleTag: "Ejemplo",
    levelLabel: "Riesgo alto",
    outOf: "de 100",
    supported: "Afirmaciones respaldadas",
    seeExample: "Ver un análisis real →"
  },
  dashboard: {
    metaTitle: "Contrast AI — Diagnóstico",
    loadErrorTitle: "No pudimos cargar este análisis",
    queryError: "No pudimos consultar el análisis.",
    failedTitle: "El análisis no pudo completarse",
    failedFallback: "Vuelve a intentarlo.",
    preparingTitle: "Estamos preparando el diagnóstico",
    sourceLabel: "Video analizado",
    voiceSourceLabel: "Grabación de voz",
    stages: {
      queued: "En cola, comenzaremos en breve",
      leased: "Preparando el análisis",
      transcribing: "Transcribiendo tu audio…",
      analyzing: "Analizando el contenido del video",
      analyzingRecording: "Analizando tu grabación",
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
    compositionTitleRecording: "De qué está hecha la grabación",
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
    recordingSays: "LA GRABACIÓN DICE",
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
    newAnalysis: "New analysis"
  },
  home: {
    metaTitle: "Contrast AI — How trustworthy is this content?",
    metaDescription:
      "We check the key claims of a video or recording against available sources and explain what deserves a closer look before you decide.",
    title: "Understand how trustworthy a video or recording is before acting on it.",
    subtitle:
      "We check the key claims against available sources and explain what deserves a closer look.",
    visualOr: "or",
    visualRecording: "Recording",
    visualConclusion: "Partially matches",
    visualSays: "The content says",
    visualFound: "We found",
    visualViewSource: "View source",
    methodology: {
      title: "How the analysis works",
      items: [
        {
          title: "We read what is said",
          detail: "We use the video's subtitles or your recording's transcript and identify the key claims that can be verified."
        },
        {
          title: "We search for public evidence",
          detail:
            "We check each claim against available sources: media outlets, official bodies, and public documentation."
        },
        {
          title: "We calculate the alert score",
          detail:
            "A higher score means more caution. We add persuasion signals such as urgency or emotional pressure."
        }
      ],
      limitsTitle: "Keep in mind",
      limits:
        "The analysis depends on the public evidence available at the time and may be incomplete or outdated."
    }
  },
  form: {
    title: "Analyze a YouTube video",
    description:
      "We'll review what the video says and the available sources. The analysis does not judge the creator.",
    label: "YouTube link",
    hint: "Paste a public link with subtitles available.",
    errorTitle: "We couldn't start the analysis",
    defaultError: "We couldn't start the analysis.",
    submit: "Analyze video",
    audio: {
      record: "Start recording",
      recording: "Recording",
      stop: "Stop",
      reviewTitle: "Review your recording",
      analyze: "Analyze recording",
      discard: "Discard",
      permissionDenied:
        "We couldn't access the microphone. Check your browser permissions; you can also analyze a YouTube link.",
      unsupported: "Your browser can't record audio. Try a YouTube link instead.",
      note: "Make sure you have permission from everyone involved before recording.",
      limitReached: "You reached the 30-minute recording limit."
    }
  },
  preview: {
    exampleTag: "Example",
    levelLabel: "High risk",
    outOf: "out of 100",
    supported: "Supported claims",
    seeExample: "See a real analysis →"
  },
  dashboard: {
    metaTitle: "Contrast AI — Video diagnosis",
    loadErrorTitle: "We couldn't load this analysis",
    queryError: "We couldn't fetch the analysis.",
    failedTitle: "The analysis could not be completed",
    failedFallback: "Try again.",
    preparingTitle: "We're preparing the diagnosis",
    sourceLabel: "Analyzed video",
    voiceSourceLabel: "Voice recording",
    stages: {
      queued: "Queued, starting shortly",
      leased: "Preparing the analysis",
      transcribing: "Transcribing your audio…",
      analyzing: "Analyzing the video content",
      analyzingRecording: "Analyzing your recording",
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
    compositionTitleRecording: "What the recording is made of",
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
    recordingSays: "THE RECORDING SAYS",
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
