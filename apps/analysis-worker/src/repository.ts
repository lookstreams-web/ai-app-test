import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisArtifacts } from "@motor/analysis-engine";
import {
  analysisQueueInputSchema,
  type AnalysisJobInput,
  type AnalysisQueueInput
} from "@motor/analysis-contracts";

export interface LeasedAnalysis {
  id: string;
  input: AnalysisQueueInput;
  attempts: number;
  leaseOwner: string;
}

export interface AnalysisRepository {
  leaseNext(workerId: string, leaseSeconds: number): Promise<LeasedAnalysis | null>;
  renewLease(id: string, workerId: string, leaseSeconds: number): Promise<boolean>;
  setProgress(id: string, workerId: string, status: string, progress: number): Promise<void>;
  replaceInput(id: string, workerId: string, input: AnalysisJobInput): Promise<void>;
  downloadAudio(path: string): Promise<Uint8Array>;
  deleteAudio(path: string): Promise<void>;
  complete(id: string, workerId: string, artifacts: AnalysisArtifacts): Promise<void>;
  releaseOrRetry(id: string, workerId: string, error: string, maxAttempts: number): Promise<void>;
  isReady(): Promise<boolean>;
}

interface AnalysisRow {
  id: string;
  input: unknown;
  attempts: number;
  lease_owner: string;
}

function rpcError(error: { message: string } | null, operation: string): void {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

export class SupabaseAnalysisRepository implements AnalysisRepository {
  constructor(private readonly client: SupabaseClient) {}

  async leaseNext(workerId: string, leaseSeconds: number): Promise<LeasedAnalysis | null> {
    const { data, error } = await this.client.rpc("lease_next_analysis", {
      p_worker_id: workerId,
      p_lease_seconds: leaseSeconds
    });
    rpcError(error, "lease_next_analysis");
    const row = (Array.isArray(data) ? data[0] : data) as AnalysisRow | null;
    return row ? {
      id: row.id,
      input: analysisQueueInputSchema.parse(row.input),
      attempts: row.attempts,
      leaseOwner: row.lease_owner
    } : null;
  }

  async renewLease(id: string, workerId: string, leaseSeconds: number): Promise<boolean> {
    const { data, error } = await this.client.rpc("renew_analysis_lease", {
      p_analysis_id: id,
      p_worker_id: workerId,
      p_lease_seconds: leaseSeconds
    });
    rpcError(error, "renew_analysis_lease");
    return data === true;
  }

  async setProgress(id: string, workerId: string, status: string, progress: number): Promise<void> {
    const { error } = await this.client.from("analyses").update({ status, progress, updated_at: new Date().toISOString() })
      .eq("id", id).eq("lease_owner", workerId);
    rpcError(error, "set_progress");
  }

  async replaceInput(id: string, workerId: string, input: AnalysisJobInput): Promise<void> {
    const { data, error } = await this.client.from("analyses")
      .update({ input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("lease_owner", workerId)
      .select("id")
      .maybeSingle();
    rpcError(error, "replace_analysis_input");
    if (!data) throw new Error("replace_analysis_input: lease_missing");
  }

  async downloadAudio(path: string): Promise<Uint8Array> {
    const { data, error } = await this.client.storage.from("analysis-audio").download(path);
    rpcError(error, "download_analysis_audio");
    if (!data) throw new Error("download_analysis_audio: empty_response");
    return new Uint8Array(await data.arrayBuffer());
  }

  async deleteAudio(path: string): Promise<void> {
    const { error } = await this.client.storage.from("analysis-audio").remove([path]);
    rpcError(error, "delete_analysis_audio");
  }

  async complete(id: string, workerId: string, artifacts: AnalysisArtifacts): Promise<void> {
    const { error } = await this.client.rpc("complete_analysis", {
      p_analysis_id: id,
      p_worker_id: workerId,
      p_final_status: artifacts.finalStatus,
      p_internal_report: artifacts.internal,
      p_public_report: artifacts.public,
      p_legacy_v1_report: artifacts.legacyV1,
      p_claims: artifacts.claims,
      p_evidence: artifacts.evidence,
      p_agent_runs: artifacts.agentRuns
    });
    rpcError(error, "complete_analysis");
  }

  async releaseOrRetry(id: string, workerId: string, errorMessage: string, maxAttempts: number): Promise<void> {
    const { error } = await this.client.rpc("release_or_retry_analysis", {
      p_analysis_id: id,
      p_worker_id: workerId,
      p_error: errorMessage,
      p_max_attempts: maxAttempts
    });
    rpcError(error, "release_or_retry_analysis");
  }

  async isReady(): Promise<boolean> {
    const { error } = await this.client.from("analyses").select("id", { head: true, count: "exact" }).limit(1);
    return error === null;
  }
}
