import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const baseEnvironment = {
  OPENAI_API_KEY: "test-openai-key",
  SUPABASE_URL: "https://example.supabase.co"
};

describe("configuración del worker", () => {
  it("acepta la clave secreta moderna de Supabase", () => {
    const config = loadConfig({ ...baseEnvironment, SUPABASE_SECRET_KEY: "sb_secret_test" });
    expect(config.SUPABASE_SERVICE_ROLE_KEY).toBe("sb_secret_test");
  });

  it("mantiene compatibilidad con service_role", () => {
    const config = loadConfig({ ...baseEnvironment, SUPABASE_SERVICE_ROLE_KEY: "legacy-test" });
    expect(config.SUPABASE_SERVICE_ROLE_KEY).toBe("legacy-test");
  });

  it("rechaza la configuración sin clave de servidor", () => {
    expect(() => loadConfig(baseEnvironment)).toThrow(/SUPABASE_SECRET_KEY/);
  });
});
