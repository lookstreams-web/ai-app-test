import { setTimeout as delay } from "node:timers/promises";
import type { Logger } from "pino";
import type { DeterministicAnalysisEngine, ProgressStage } from "@motor/analysis-engine";
import type { WorkerConfig } from "./config.js";
import type { AnalysisRepository, LeasedAnalysis } from "./repository.js";

export class AnalysisWorker {
  private stopped = false;
  private started = false;

  constructor(
    private readonly workerId: string,
    private readonly repository: AnalysisRepository,
    private readonly engine: DeterministicAnalysisEngine,
    private readonly config: WorkerConfig,
    private readonly logger: Logger
  ) {}

  get isStarted(): boolean { return this.started; }

  stop(): void { this.stopped = true; }

  async processJob(job: LeasedAnalysis): Promise<void> {
    const log = this.logger.child({ analysisId: job.id, workerId: this.workerId, attempt: job.attempts });
    const controller = new AbortController();
    const timeoutMs = Math.min(this.config.ANALYSIS_TIMEOUT_MS, job.input.options.timeBudgetMs);
    const timeout = setTimeout(() => controller.abort(new Error("analysis_timeout")), timeoutMs);
    const heartbeat = setInterval(() => {
      void this.repository.renewLease(job.id, this.workerId, this.config.LEASE_SECONDS).then((renewed) => {
        if (!renewed) controller.abort(new Error("lease_lost"));
      }).catch((error: unknown) => {
        log.warn({ error: error instanceof Error ? error.message : "unknown" }, "lease_renewal_failed");
      });
    }, this.config.LEASE_RENEW_INTERVAL_MS);

    try {
      const artifacts = await this.engine.analyze(job.input, {
        signal: controller.signal,
        onProgress: async (stage: ProgressStage, progress: number) => {
          await this.repository.setProgress(job.id, this.workerId, stage, progress);
          log.info({ stage, progress }, "analysis_progress");
        }
      });
      await this.repository.complete(job.id, this.workerId, artifacts);
      log.info({ stage: artifacts.finalStatus, claimCount: artifacts.claims.length, evidenceCount: artifacts.evidence.length }, "analysis_completed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      log.error({ error: message }, "analysis_failed");
      await this.repository.releaseOrRetry(job.id, this.workerId, message, this.config.MAX_ATTEMPTS);
    } finally {
      clearInterval(heartbeat);
      clearTimeout(timeout);
    }
  }

  async run(): Promise<void> {
    this.started = true;
    this.logger.info({ workerId: this.workerId }, "worker_started");
    while (!this.stopped) {
      try {
        const jobs = (await Promise.all(Array.from({ length: this.config.JOB_CONCURRENCY }, () =>
          this.repository.leaseNext(this.workerId, this.config.LEASE_SECONDS)
        ))).filter((job): job is LeasedAnalysis => job !== null);
        if (jobs.length) await Promise.all(jobs.map((job) => this.processJob(job)));
        else await delay(this.config.POLL_INTERVAL_MS, undefined, { ref: false });
      } catch (error) {
        this.logger.error({ error: error instanceof Error ? error.message : "unknown_error" }, "worker_loop_error");
        await delay(this.config.POLL_INTERVAL_MS, undefined, { ref: false });
      }
    }
  }
}
