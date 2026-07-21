import { analysisJobInputSchema, type AnalysisJobInput } from '@motor/analysis-contracts';
import type { YoutubeTranscriptResult } from '@/lib/youtube/transcript';

export function buildYoutubeAnalysisInput(
  sourceUrl: string,
  transcript: YoutubeTranscriptResult,
  outputLanguage: 'es' | 'en' = 'es',
): AnalysisJobInput {
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
  });
}
