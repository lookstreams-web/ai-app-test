import { describe, expect, it } from "vitest";
import {
  abortable,
  analysisProgressAfterTranscription,
  transcriptionProgress
} from "./audio.js";

describe("progreso y timeout de transcripción", () => {
  it("reserva 0–30 para transcripción y 30–100 para análisis", () => {
    expect(transcriptionProgress(0)).toBe(1);
    expect(transcriptionProgress(0.5)).toBe(15);
    expect(transcriptionProgress(100)).toBe(30);
    expect(analysisProgressAfterTranscription(10)).toBe(37);
    expect(analysisProgressAfterTranscription(100)).toBe(100);
  });

  it("interrumpe la espera cuando vence el presupuesto global", async () => {
    const controller = new AbortController();
    const operation = new Promise<string>(() => undefined);
    const result = abortable(operation, controller.signal);
    controller.abort(new Error("analysis_timeout"));
    await expect(result).rejects.toThrow("analysis_timeout");
  });
});
