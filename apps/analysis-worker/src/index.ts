import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotEnv } from "dotenv";
import pino from "pino";
import { DeterministicAnalysisEngine, OpenAIAgentGateway } from "@motor/analysis-engine";
import { loadConfig } from "./config.js";
import { SupabaseAnalysisRepository } from "./repository.js";
import { createHealthServer } from "./server.js";
import { AnalysisWorker } from "./worker.js";

loadDotEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const config = loadConfig();
const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: "analysis-worker" },
  redact: {
    paths: ["input", "transcript", "prompt", "response", "*.input", "*.transcript", "*.prompt", "*.response"],
    censor: "[REDACTED]"
  }
});

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const repository = new SupabaseAnalysisRepository(supabase);
const gateway = new OpenAIAgentGateway({ generalModel: config.OPENAI_MODEL_GENERAL, judgeModel: config.OPENAI_MODEL_JUDGE });
const engine = new DeterministicAnalysisEngine(gateway, {
  maxClaims: config.MAX_CLAIMS,
  claimConcurrency: config.CLAIM_CONCURRENCY,
  emitLegacyV1: config.EMIT_LEGACY_V1,
  generalModel: config.OPENAI_MODEL_GENERAL,
  judgeModel: config.OPENAI_MODEL_JUDGE
});
const worker = new AnalysisWorker(`worker-${randomUUID()}`, repository, engine, config, logger);
const server = createHealthServer(repository, () => worker.isStarted);

server.listen(config.PORT, "0.0.0.0", () => logger.info({ port: config.PORT }, "health_server_started"));
void worker.run();

function shutdown(signal: string): void {
  logger.info({ signal }, "worker_stopping");
  worker.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export * from "./config.js";
export * from "./repository.js";
export * from "./server.js";
export * from "./worker.js";
