import { createReadStream } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import OpenAI from "openai";
import { prepareAudioChunks, SEGMENT_SECONDS } from "./chunking.js";

/**
 * Adaptador de transcripción de OpenAI.
 *
 * Estrategia interna (la API de audio de OpenAI no tiene timestamps nativos y
 * trunca inputs largos): re-codificación + troceo por duración con ffmpeg
 * (~5 min), luego transcripción secuencial con contexto rodante — la petición
 * de cada chunk lleva el contexto base más la cola del transcript acumulado,
 * manteniendo consistentes los nombres propios entre cortes. Emite un segmento
 * por chunk, ya en el formato del contrato (`id`, `startSeconds`, `endSeconds`,
 * `text`, `confidence: null`).
 */

export const TRANSCRIPT_CONTEXT_TAIL_CHARS = 2000;

export interface AudioSegment {
  id: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
  confidence: null;
}

export interface AudioTranscriptResult {
  language: "es" | "en";
  segments: AudioSegment[];
  fullText: string;
  // El worker exige un número no nulo (usa `> 0 ? valor : null`); cuando ffprobe
  // no detecta la duración devolvemos 0 en lugar de null.
  durationSeconds: number;
}

export interface TranscribeOptions {
  language: "es" | "en";
  /**
   * Callback de progreso como fracción 0..1 (chunks transcritos / totales). El
   * worker la reescala a su barra de progreso (`transcriptionProgress`).
   */
  onProgress?: (progress: number) => void | Promise<void>;
  /** Señal de aborto del worker (timeout de análisis o pérdida de lease). */
  signal?: AbortSignal;
}

// ─── Helpers puros (con tests unitarios) ──────────────────────────

export function buildBaseContext(opts: { language: "es" | "en" }): string {
  const languageName = opts.language === "es" ? "Spanish" : "English";
  return `Voice recording of a user narrating claims to fact-check, mostly in ${languageName}.`;
}

export function buildChunkPrompt(baseContext: string, priorTranscript: string): string {
  const tail = priorTranscript.slice(-TRANSCRIPT_CONTEXT_TAIL_CHARS);
  if (baseContext && tail) {
    return `${baseContext}\nPrevious transcript: ${tail}`;
  }
  if (tail) {
    return `Previous transcript: ${tail}`;
  }
  return baseContext;
}

/**
 * Construye los segmentos del contrato a partir del texto de cada chunk. El
 * índice del chunk fija los timestamps (cada chunk dura `SEGMENT_SECONDS`); los
 * chunks vacíos se omiten sin desalinear los índices restantes.
 */
export function buildSegments(chunkTexts: string[], durationSeconds: number | null): AudioSegment[] {
  const segments: AudioSegment[] = [];
  chunkTexts.forEach((text, index) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const startSeconds = index * SEGMENT_SECONDS;
    const endBound = (index + 1) * SEGMENT_SECONDS;
    const capped = durationSeconds ? Math.min(endBound, Math.ceil(durationSeconds)) : endBound;
    segments.push({
      id: `segment-${index + 1}`,
      startSeconds,
      endSeconds: Math.max(capped, startSeconds),
      text: trimmed,
      confidence: null
    });
  });
  return segments;
}

// ─── Cliente OpenAI y transcripción de chunks ─────────────────────

let client: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY no está configurada.");
  }
  if (!client) {
    client = new OpenAI();
  }
  return client;
}

export const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-transcribe";

async function transcribeChunk(
  chunkPath: string,
  opts: { language: "es" | "en"; prompt: string; signal: AbortSignal | undefined }
): Promise<string> {
  const openai = getOpenAI();

  // Con response_format 'text' el SDK lo tipa como string, pero algunas
  // combinaciones de modelo/SDK devuelven { text }: manejamos ambas.
  const response = (await openai.audio.transcriptions.create(
    {
      file: createReadStream(chunkPath),
      model: TRANSCRIBE_MODEL,
      language: opts.language,
      prompt: opts.prompt,
      response_format: "text"
    },
    { signal: opts.signal }
  )) as unknown as string | { text: string };

  return (typeof response === "string" ? response : response.text).trim();
}

/**
 * Transcribe una grabación de voz completa. Acepta un `Buffer` (lo que descarga
 * el worker del bucket) o una ruta local. Gestiona su propio directorio temporal
 * y lo limpia siempre en `finally`.
 */
export async function transcribeAudio(
  audio: Uint8Array | string,
  options: TranscribeOptions
): Promise<AudioTranscriptResult> {
  const workDir = await mkdtemp(path.join(os.tmpdir(), "voice-"));
  try {
    let inputPath: string;
    if (typeof audio === "string") {
      inputPath = audio;
    } else {
      inputPath = path.join(workDir, "source.webm");
      await writeFile(inputPath, audio);
    }

    const { chunkPaths, durationSeconds } = await prepareAudioChunks(inputPath, workDir);

    const baseContext = buildBaseContext({ language: options.language });
    const chunkTexts: string[] = [];
    const priorTexts: string[] = [];

    for (const [index, chunkPath] of chunkPaths.entries()) {
      // El worker envuelve esta promesa en `abortable`, pero cortamos también
      // entre chunks para no lanzar una petición más tras el aborto.
      if (options.signal?.aborted) throw options.signal.reason ?? new Error("analysis_timeout");
      const prompt = buildChunkPrompt(baseContext, priorTexts.join(" "));
      const text = await transcribeChunk(chunkPath, { language: options.language, prompt, signal: options.signal });
      chunkTexts.push(text);
      if (text) priorTexts.push(text);
      await options.onProgress?.((index + 1) / chunkPaths.length);
    }

    const segments = buildSegments(chunkTexts, durationSeconds);
    return {
      language: options.language,
      segments,
      fullText: segments.map((segment) => segment.text).join("\n\n"),
      durationSeconds: durationSeconds ?? 0
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
