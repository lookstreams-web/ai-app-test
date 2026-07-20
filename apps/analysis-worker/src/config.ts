import { z } from "zod";

const booleanFromEnv = z.string().default("true").transform((value) => value.toLowerCase() === "true");

const workerEnvironmentSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),
  OPENAI_MODEL_GENERAL: z.string().default("gpt-5.6-terra"),
  OPENAI_MODEL_JUDGE: z.string().default("gpt-5.6-sol"),
  MAX_CLAIMS: z.coerce.number().int().min(1).max(5).default(3),
  CLAIM_CONCURRENCY: z.coerce.number().int().min(1).max(5).default(3),
  JOB_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(1),
  POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(2_000),
  LEASE_SECONDS: z.coerce.number().int().min(60).default(120),
  LEASE_RENEW_INTERVAL_MS: z.coerce.number().int().min(10_000).default(30_000),
  MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  ANALYSIS_TIMEOUT_MS: z.coerce.number().int().min(30_000).max(900_000).default(600_000),
  EMIT_LEGACY_V1: booleanFromEnv,
  PORT: z.coerce.number().int().min(1).max(65_535).default(3_001),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info")
}).superRefine((environment, context) => {
  if (!environment.SUPABASE_SECRET_KEY && !environment.SUPABASE_SERVICE_ROLE_KEY) {
    context.addIssue({
      code: "custom",
      message: "Configura SUPABASE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY",
      path: ["SUPABASE_SECRET_KEY"]
    });
  }
});

export const workerConfigSchema = workerEnvironmentSchema.transform((environment) => ({
  ...environment,
  SUPABASE_SERVICE_ROLE_KEY: environment.SUPABASE_SECRET_KEY || environment.SUPABASE_SERVICE_ROLE_KEY
}));

export type WorkerConfig = z.infer<typeof workerConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  return workerConfigSchema.parse(env);
}
