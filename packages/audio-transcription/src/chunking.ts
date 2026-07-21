import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

/**
 * Preparación de audio para el pipeline de transcripción.
 *
 * Las grabaciones largas deben trocearse POR DURACIÓN (no por tamaño): la API
 * de audio de OpenAI trunca el transcript de inputs largos aunque el archivo
 * pese menos del límite de 25MB. Siempre re-codificamos + segmentamos en una
 * sola pasada de ffmpeg (16kHz mono mp3 — la voz no necesita estéreo ni sample
 * rates altos), así el audio corto rinde un solo chunk y hay un único camino.
 */

export const SEGMENT_SECONDS = 300; // chunks de 5 minutos, default probado
export const DEFAULT_BITRATE_KBPS = 32; // ~1.2MB por chunk de 5 min
const MIN_BITRATE_KBPS = 24;
const MAX_BITRATE_KBPS = 48;

// ─── Helpers puros (con tests unitarios) ──────────────────────────

export function buildSegmentArgs(
  inputPath: string,
  outPattern: string,
  opts: { bitrateKbps: number; segmentSeconds: number }
): string[] {
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-b:a",
    `${opts.bitrateKbps}k`,
    "-f",
    "segment",
    "-segment_time",
    String(opts.segmentSeconds),
    "-reset_timestamps",
    "1",
    "-y",
    outPattern
  ];
}

export function parseFfprobeDuration(stdout: string): number | null {
  const value = Number.parseFloat(stdout.trim());
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function computeBitrateKbps(segmentSeconds: number, maxChunkBytes: number): number {
  // 90% de margen sobre el tamaño teórico, acotado a un rango sensato de voz.
  const kbps = Math.floor((maxChunkBytes * 8 * 0.9) / segmentSeconds / 1000);
  return Math.max(MIN_BITRATE_KBPS, Math.min(kbps, MAX_BITRATE_KBPS));
}

// ─── Ejecución de ffmpeg/ffprobe ──────────────────────────────────

function resolveFfmpegPath(): string {
  const ffmpegPath = ffmpegStatic as unknown as string | null;
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static no resolvió un binario para esta plataforma");
  }
  return ffmpegPath;
}

function resolveFfprobePath(): string {
  const ffprobe = ffprobeStatic as unknown as { path: string };
  if (!ffprobe?.path) {
    throw new Error("ffprobe-static no resolvió un binario para esta plataforma");
  }
  return ffprobe.path;
}

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => (stdout += data));
    child.stderr.on("data", (data) => (stderr += data));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr.trim() || `${command} terminó con código ${code}`));
      }
    });
  });
}

export async function probeDurationSeconds(inputPath: string): Promise<number | null> {
  try {
    const stdout = await run(resolveFfprobePath(), [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      inputPath
    ]);
    return parseFfprobeDuration(stdout);
  } catch {
    // La duración es solo informativa — nunca falla el pipeline por ella.
    return null;
  }
}

/**
 * Re-codifica + segmenta el audio fuente en chunks mp3 mono 16kHz de 5 minutos
 * dentro de `workDir`. Devuelve las rutas ordenadas y la duración detectada.
 */
export async function prepareAudioChunks(
  inputPath: string,
  workDir: string
): Promise<{ chunkPaths: string[]; durationSeconds: number | null }> {
  const durationSeconds = await probeDurationSeconds(inputPath);

  const outPattern = path.join(workDir, "chunk_%03d.mp3");
  await run(
    resolveFfmpegPath(),
    buildSegmentArgs(inputPath, outPattern, {
      bitrateKbps: DEFAULT_BITRATE_KBPS,
      segmentSeconds: SEGMENT_SECONDS
    })
  );

  const files = await readdir(workDir);
  const chunkPaths = files
    .filter((file) => /^chunk_\d{3}\.mp3$/.test(file))
    .sort()
    .map((file) => path.join(workDir, file));

  if (chunkPaths.length === 0) {
    throw new Error("ffmpeg no produjo chunks de audio");
  }

  return { chunkPaths, durationSeconds };
}
