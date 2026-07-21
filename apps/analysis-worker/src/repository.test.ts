import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { AnalysisArtifacts } from "@motor/analysis-engine";
import type { AnalysisRepository, LeasedAnalysis } from "./repository.js";

class AtomicMemoryRepository implements AnalysisRepository {
  private leased = false;
  constructor(private readonly job: LeasedAnalysis) {}
  async leaseNext(workerId: string, leaseSeconds: number): Promise<LeasedAnalysis | null> {
    void workerId;
    void leaseSeconds;
    if (this.leased) return null;
    this.leased = true;
    await Promise.resolve();
    return this.job;
  }
  async renewLease(id: string, workerId: string, leaseSeconds: number) { void id; void workerId; void leaseSeconds; return true; }
  async setProgress(id: string, workerId: string, status: string, progress: number) { void id; void workerId; void status; void progress; }
  async replaceInput(id: string, workerId: string, input: Parameters<AnalysisRepository["replaceInput"]>[2]) { void id; void workerId; void input; }
  async downloadAudio(path: string) { void path; return new Uint8Array(); }
  async deleteAudio(path: string) { void path; }
  async complete(id: string, workerId: string, artifacts: AnalysisArtifacts) { void id; void workerId; void artifacts; }
  async releaseOrRetry(id: string, workerId: string, error: string, maxAttempts: number) { void id; void workerId; void error; void maxAttempts; this.leased = false; }
  async isReady() { return true; }
}

describe("cola de análisis", () => {
  it("dos workers no pueden reservar el mismo análisis", async () => {
    const repository = new AtomicMemoryRepository({
      id: "a1",
      input: {
        kind: "audioPending",
        audioPath: "a1.webm",
        language: "es",
        outputLanguage: "es",
        recordedAt: null
      },
      attempts: 1,
      leaseOwner: "worker"
    });
    const results = await Promise.all([repository.leaseNext("w1", 120), repository.leaseNext("w2", 120)]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("la migración usa SKIP LOCKED, recuperación y finalización atómica", () => {
    const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202607200001_analysis_engine.sql"), "utf8");
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain("a.lease_expires_at < now()");
    expect(sql).toContain("create or replace function public.complete_analysis");
    expect(sql).toContain("on conflict (analysis_id, external_id) do update");
  });

  it("la migración de voz recupera leases durante la transcripción", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/202607210001_voice_recording.sql"),
      "utf8"
    );
    expect(sql).toContain("'transcribing'");
    expect(sql).toContain("a.status in ('leased', 'transcribing'");
    expect(sql).toContain("status in ('leased', 'transcribing'");
  });
});
