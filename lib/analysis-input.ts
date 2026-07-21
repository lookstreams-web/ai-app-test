import {
  analysisJobInputSchema,
  audioJobEnvelopeSchema,
  type AnalysisJobInput,
  type AudioJobEnvelope,
  type YoutubeSource,
} from '@motor/analysis-contracts';
import type { YoutubeTranscriptResult } from '@/lib/youtube/transcript';

export type YoutubeAnalysisJobInput = AnalysisJobInput & { source: YoutubeSource };

/**
 * Bucket privado donde la web sube el audio pendiente de transcribir. Debe
 * coincidir con el que descarga el worker (`storage.from('analysis-audio')`).
 */
export const ANALYSIS_AUDIO_BUCKET = 'analysis-audio';

/** Límite de subida de audio (~1h de voz en webm/opus). */
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

/**
 * Ruta convencional del objeto de audio dentro del bucket. El worker no la
 * calcula: descarga `envelope.audioPath` tal cual, así que basta con que la web
 * suba el objeto a esta ruta y la guarde en el sobre.
 */
export function audioObjectPath(analysisId: string): string {
  return `${analysisId}.webm`;
}

/**
 * Construye el sobre `audioPending` que la web encola. El AnalysisJobInput de
 * texto lo arma el worker al transcribir; aquí solo viaja la referencia al audio.
 */
export function buildAudioJobEnvelope(
  audioPath: string,
  language: 'es' | 'en',
  outputLanguage: 'es' | 'en' = 'es',
  recordedAt: string | null = null,
): AudioJobEnvelope {
  return audioJobEnvelopeSchema.parse({
    kind: 'audioPending',
    audioPath,
    language,
    outputLanguage,
    recordedAt,
  });
}

export function buildYoutubeAnalysisInput(
  sourceUrl: string,
  transcript: YoutubeTranscriptResult,
  outputLanguage: 'es' | 'en' = 'es',
): YoutubeAnalysisJobInput {
  const segments = transcript.segments.map((segment, index) => ({
    id: `segment-${index + 1}`,
    startSeconds: segment.offsetSeconds,
    endSeconds: segment.offsetSeconds + segment.durationSeconds,
    text: segment.text,
    confidence: null,
  }));
  const durationSeconds = segments.reduce((maximum, segment) => Math.max(maximum, segment.endSeconds), 0);

  return analysisJobInputSchema.parse({
    source: {
      kind: 'youtube',
      url: sourceUrl,
      videoId: transcript.videoId,
      title: transcript.title ?? 'Video de YouTube',
      durationSeconds: durationSeconds > 0 ? durationSeconds : null,
      channel: {
        id: null,
        name: transcript.channelName ?? 'Canal no identificado',
        url: transcript.channelUrl,
      },
    },
    transcript: {
      language: transcript.language || 'es',
      origin: 'youtube',
      coverage: 1,
      segments,
    },
    suppliedContext: {
      declaredLinks: [],
      recentVideos: [],
      comments: [],
    },
    options: {
      outputLanguage,
    },
  }) as YoutubeAnalysisJobInput;
}
