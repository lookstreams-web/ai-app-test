import {
  analysisJobInputSchema,
  type AnalysisJobInput,
  type AnalysisQueueInput,
  type AudioJobEnvelope
} from "@motor/analysis-contracts";

export interface AudioTranscriptionResult {
  language: string;
  segments: AnalysisJobInput["transcript"]["segments"];
  fullText: string;
  durationSeconds: number;
}

export interface AudioTranscriptionOptions {
  language: AudioJobEnvelope["language"];
  onProgress?: (progress: number) => Promise<void> | void;
  signal?: AbortSignal;
}

export type TranscribeAudio = (
  audio: Uint8Array,
  options: AudioTranscriptionOptions
) => Promise<AudioTranscriptionResult>;

export function isAudioPending(input: AnalysisQueueInput): input is AudioJobEnvelope {
  return (input as { kind?: unknown }).kind === "audioPending";
}

export function transcriptionProgress(progress: number): number {
  const percentage = progress <= 1 ? progress * 100 : progress;
  return Math.max(1, Math.min(30, Math.round(percentage * 0.3)));
}

export function analysisProgressAfterTranscription(progress: number): number {
  return Math.max(30, Math.min(100, Math.round(30 + progress * 0.7)));
}

export async function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw signal.reason ?? new Error("analysis_timeout");

  let rejectOnAbort: ((reason?: unknown) => void) | null = null;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectOnAbort = reject;
  });
  const onAbort = () => rejectOnAbort?.(signal.reason ?? new Error("analysis_timeout"));
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    return await Promise.race([operation, aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

export function buildVoiceAnalysisInput(
  envelope: AudioJobEnvelope,
  transcription: AudioTranscriptionResult
): AnalysisJobInput {
  return analysisJobInputSchema.parse({
    source: {
      kind: "voiceRecording",
      title: envelope.outputLanguage === "en" ? "Voice recording" : "Grabación de voz",
      durationSeconds: transcription.durationSeconds > 0 ? transcription.durationSeconds : null,
      recordedAt: envelope.recordedAt
    },
    transcript: {
      language: transcription.language || envelope.language,
      origin: "speechToText",
      coverage: 1,
      segments: transcription.segments
    },
    options: {
      outputLanguage: envelope.outputLanguage,
      publicContext: false
    }
  });
}

/**
 * Puente temporal: Joel añadirá @motor/audio-transcription como dependencia del worker.
 * La importación diferida evita afectar los trabajos de YouTube mientras llega el paquete.
 */
export const transcribeAudioWithPackage: TranscribeAudio = async (audio, options) => {
  const packageName = "@motor/audio-transcription";
  const module = await import(packageName) as { transcribeAudio?: TranscribeAudio };
  if (typeof module.transcribeAudio !== "function") {
    throw new Error("audio_transcription_package_has_no_transcribeAudio_export");
  }
  return module.transcribeAudio(audio, options);
};
