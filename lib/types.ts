export type AnalysisStatus =
  | 'queued'
  | 'leased'
  | 'analyzing'
  | 'researching'
  | 'adjudicating'
  | 'scoring'
  | 'synthesizing'
  | 'completed'
  | 'partial'
  | 'needs_review'
  | 'failed';

// Segmento de transcript con timestamps (unidad: segundos).
export interface TranscriptSegment {
  text: string;
  offsetSeconds: number;
  durationSeconds: number;
}
