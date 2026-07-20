import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisArtifacts } from "@motor/analysis-engine";
import type { AnalysisJobInput } from "@motor/analysis-contracts";

export interface LeasedAnalysis {
  id: string;
  input: AnalysisJobInput;
  attempts: number;
  leaseOwner: string;
}

export interface AnalysisRepository {
  leaseNext(workerId: string, leaseSeconds: number): Promise<LeasedAnalysis | null>;
  renewLease(id: string, workerId: string, leaseSeconds: number): Promise<boolean>;
  setProgress(id: string, workerId: string, status: string, progress: number): Promise<void>;
  complete(id: string, workerId: string, artifacts: AnalysisArtifacts): Promise<void>;
  releaseOrRetry(id: string, workerId: string, error: string, maxAttempts: number): Promise<void>;
  isReady(): Promise<boolean>;
}

interface AnalysisRow {
  id: string;
  input: AnalysisJobInput;
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
    return row ? { id: row.id, input: row.input, attempts: row.attempts, leaseOwner: row.lease_owner } : null;
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
