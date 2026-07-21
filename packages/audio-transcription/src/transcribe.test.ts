import { describe, expect, it } from "vitest";
import { transcriptSegmentSchema } from "@motor/analysis-contracts";
import {
  buildBaseContext,
  buildChunkPrompt,
  buildSegments,
  TRANSCRIPT_CONTEXT_TAIL_CHARS
} from "./transcribe.js";

describe("buildBaseContext", () => {
  it("describe una grabación de voz relatando afirmaciones a verificar", () => {
    const context = buildBaseContext({ language: "es" });
    expect(context).toContain("Voice recording");
    expect(context).toContain("fact-check");
    expect(context).toContain("Spanish");
  });

  it("nombra el inglés para grabaciones en en", () => {
    expect(buildBaseContext({ language: "en" })).toContain("English");
  });
});

describe("buildChunkPrompt", () => {
  it("devuelve solo el contexto base para el primer chunk", () => {
    expect(buildChunkPrompt("Base context.", "")).toBe("Base context.");
  });

  it("añade el transcript previo después del contexto base", () => {
    const prompt = buildChunkPrompt("Base.", "hello world");
    expect(prompt).toBe("Base.\nPrevious transcript: hello world");
  });

  it("trunca el transcript previo a los últimos N chars", () => {
    const prior = "x".repeat(TRANSCRIPT_CONTEXT_TAIL_CHARS + 500);
    const prompt = buildChunkPrompt("Base.", prior);
    const tail = prompt.split("Previous transcript: ")[1];
    expect(tail).toHaveLength(TRANSCRIPT_CONTEXT_TAIL_CHARS);
  });

  it("maneja un contexto base vacío con transcript previo", () => {
    expect(buildChunkPrompt("", "prior text")).toBe("Previous transcript: prior text");
  });
});

describe("buildSegments", () => {
  it("mapea cada chunk a un segmento del contrato con timestamps por índice", () => {
    const segments = buildSegments(["primero", "segundo"], 412);
    expect(segments).toEqual([
      { id: "segment-1", startSeconds: 0, endSeconds: 300, text: "primero", confidence: null },
      { id: "segment-2", startSeconds: 300, endSeconds: 412, text: "segundo", confidence: null }
    ]);
  });

  it("produce segmentos que el contrato acepta", () => {
    for (const segment of buildSegments(["hola", "mundo"], 600)) {
      expect(transcriptSegmentSchema.safeParse(segment).success).toBe(true);
    }
  });

  it("omite los chunks vacíos sin desalinear los índices restantes", () => {
    const segments = buildSegments(["primero", "   ", "tercero"], null);
    expect(segments.map((segment) => segment.id)).toEqual(["segment-1", "segment-3"]);
    expect(segments[1]?.startSeconds).toBe(600);
  });

  it("nunca deja endSeconds por debajo de startSeconds", () => {
    const segments = buildSegments(["a", "b"], 120);
    for (const segment of segments) {
      expect(segment.endSeconds).toBeGreaterThanOrEqual(segment.startSeconds);
    }
  });
});
