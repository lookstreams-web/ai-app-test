import type { TranscriptSegment } from '@/lib/types';

/**
 * STUB de transcripción voz→texto (Whisper) — lo implementa JOEL.
 * Para `sourceType: "audio"`. Devuelve segmentos con timestamps igual que YouTube,
 * para reutilizar la misma canonicalización de citas.
 */

export interface AudioTranscriptResult {
  language: string;
  segments: TranscriptSegment[];
  fullText: string;
}

export async function transcribeAudio(_file: Blob): Promise<AudioTranscriptResult> {
  void _file;
  throw new Error('not implemented — Joel (voz a texto / Whisper)');
}
