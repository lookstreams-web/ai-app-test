import { describe, expect, it } from "vitest";
import {
  buildSegmentArgs,
  computeBitrateKbps,
  parseFfprobeDuration,
  SEGMENT_SECONDS
} from "./chunking.js";

describe("buildSegmentArgs", () => {
  it("construye el argv exacto de ffmpeg para mp3 segmentado mono 16kHz", () => {
    const args = buildSegmentArgs("/tmp/in.m4a", "/tmp/chunk_%03d.mp3", {
      bitrateKbps: 32,
      segmentSeconds: 300
    });

    expect(args).toEqual([
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      "/tmp/in.m4a",
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-b:a",
      "32k",
      "-f",
      "segment",
      "-segment_time",
      "300",
      "-reset_timestamps",
      "1",
      "-y",
      "/tmp/chunk_%03d.mp3"
    ]);
  });

  it("usa el bitrate y la duración de segmento provistos", () => {
    const args = buildSegmentArgs("in.mp3", "out_%03d.mp3", {
      bitrateKbps: 48,
      segmentSeconds: 120
    });
    expect(args).toContain("48k");
    expect(args).toContain("120");
  });
});

describe("parseFfprobeDuration", () => {
  it("parsea una duración válida", () => {
    expect(parseFfprobeDuration("3723.5\n")).toBe(3723.5);
  });

  it("devuelve null para salida basura", () => {
    expect(parseFfprobeDuration("N/A")).toBeNull();
    expect(parseFfprobeDuration("")).toBeNull();
  });

  it("devuelve null para duraciones cero o negativas", () => {
    expect(parseFfprobeDuration("0")).toBeNull();
    expect(parseFfprobeDuration("-5")).toBeNull();
  });
});

describe("computeBitrateKbps", () => {
  it("acota al mínimo para presupuestos de chunk minúsculos", () => {
    expect(computeBitrateKbps(SEGMENT_SECONDS, 100_000)).toBe(24);
  });

  it("acota al máximo para presupuestos de chunk enormes", () => {
    expect(computeBitrateKbps(SEGMENT_SECONDS, 25 * 1024 * 1024)).toBe(48);
  });

  it("calcula un bitrate proporcional dentro del rango", () => {
    // 1.5MB en 300s → (1.5MB * 8 * 0.9) / 300 / 1000 = 36 kbps
    expect(computeBitrateKbps(300, 1_500_000)).toBe(36);
  });
});
