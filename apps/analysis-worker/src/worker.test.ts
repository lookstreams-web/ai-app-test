import pino from "pino";
import { describe, expect, it } from "vitest";
import type { AnalysisArtifacts } from "@motor/analysis-engine";
import type { AnalysisJobInput } from "@motor/analysis-contracts";
import { loadConfig } from "./config.js";
import type { AnalysisRepository, LeasedAnalysis } from "./repository.js";
import { AnalysisWorker } from "./worker.js";

const config = loadConfig({
  OPENAI_API_KEY: "test",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "test",
  LEASE_RENEW_INTERVAL_MS: "10000",
  ANALYSIS_TIMEOUT_MS: "30000"
});

const completedArtifacts = {
  finalStatus: "completed",
  claims: [],
  evidence: [],
  agentRuns: [],
  internal: {},
  public: {},
  legacyV1: null
} as unknown as AnalysisArtifacts;

function audioJob(attempts = 1): LeasedAnalysis {
  return {
    id: "analysis-1",
    input: {
      kind: "audioPending",
      audioPath: "analysis-1.webm",
      language: "es",
      outputLanguage: "es",
      recordedAt: null
    },
    attempts,
    leaseOwner: "worker-1"
  };
}

class MemoryRepository implements AnalysisRepository {
  replacedInput: AnalysisJobInput | null = null;
  progress: Array<{ status: string; progress: number }> = [];
  deletedPaths: string[] = [];
  completed = 0;
  released = 0;

  async leaseNext() { return null; }
  async renewLease() { return true; }
  async setProgress(_id: string, _workerId: string, status: string, progress: number) {
    this.progress.push({ status, progress });
  }
  async replaceInput(_id: string, _workerId: string, input: AnalysisJobInput) {
    this.replacedInput = input;
  }
  async downloadAudio() { return new Uint8Array([1, 2, 3]); }
  async deleteAudio(path: string) { this.deletedPaths.push(path); }
  async complete() { this.completed += 1; }
  async releaseOrRetry() { this.released += 1; }
  async isReady() { return true; }
}

describe("worker con entrada de voz", () => {
  it("transcribe, persiste el texto, borra el audio y después analiza", async () => {
    const repository = new MemoryRepository();
    let analyzedInput: AnalysisJobInput | null = null;
    const worker = new AnalysisWorker(
      "worker-1",
      repository,
      {
        async analyze(input) {
          analyzedInput = input;
          return completedArtifacts;
        }
      },
      async (_audio, options) => {
        await options.onProgress?.(0.5);
        return {
          language: "es",
          fullText: "Contenido de voz",
          durationSeconds: 12,
          segments: [{
            id: "segment-1",
            startSeconds: 0,
            endSeconds: 12,
            text: "Contenido de voz",
            confidence: null
          }]
        };
      },
      config,
      pino({ level: "silent" })
    );

    await worker.processJob(audioJob());

    expect(repository.progress).toContainEqual({ status: "transcribing", progress: 15 });
    expect(repository.replacedInput?.source.kind).toBe("voiceRecording");
    expect(repository.replacedInput?.options.publicContext).toBe(false);
    expect(repository.deletedPaths).toEqual(["analysis-1.webm"]);
    expect(analyzedInput?.transcript.origin).toBe("speechToText");
    expect(repository.completed).toBe(1);
  });

  it("un reintento con el input persistido no vuelve a transcribir", async () => {
    const repository = new MemoryRepository();
    let transcriptions = 0;
    let analyses = 0;
    const worker = new AnalysisWorker(
      "worker-1",
      repository,
      {
        async analyze() {
          analyses += 1;
          if (analyses === 1) throw new Error("analysis_failed_after_transcription");
          return completedArtifacts;
        }
      },
      async () => {
        transcriptions += 1;
        return {
          language: "es",
          fullText: "Contenido",
          durationSeconds: 2,
          segments: [{
            id: "segment-1",
            startSeconds: 0,
            endSeconds: 2,
            text: "Contenido",
            confidence: null
          }]
        };
      },
      config,
      pino({ level: "silent" })
    );

    await worker.processJob(audioJob());
    expect(repository.replacedInput).not.toBeNull();
    await worker.processJob({ ...audioJob(2), input: repository.replacedInput! });

    expect(transcriptions).toBe(1);
    expect(repository.released).toBe(1);
    expect(repository.completed).toBe(1);
  });

  it("borra el audio si la transcripción agota el último intento", async () => {
    const repository = new MemoryRepository();
    const worker = new AnalysisWorker(
      "worker-1",
      repository,
      { async analyze() { return completedArtifacts; } },
      async () => { throw new Error("transcription_failed"); },
      config,
      pino({ level: "silent" })
    );

    await worker.processJob(audioJob(config.MAX_ATTEMPTS));

    expect(repository.released).toBe(1);
    expect(repository.deletedPaths).toEqual(["analysis-1.webm"]);
    expect(repository.completed).toBe(0);
  });
});
