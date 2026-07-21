import { describe, expect, it } from "vitest";
import { outputLanguageInstruction } from "./openai-gateway.js";

describe("instrucción de idioma para agentes", () => {
  it("ordena inglés sin traducir citas ni alterar el schema", () => {
    const instruction = outputLanguageInstruction("en");
    expect(instruction).toContain("in English");
    expect(instruction).toContain("Preserve literal quotes");
    expect(instruction).toContain("enum values exactly");
  });

  it("mantiene español como idioma predeterminado", () => {
    const instruction = outputLanguageInstruction("es");
    expect(instruction).toContain("en español");
    expect(instruction).toContain("Conserva las citas literales");
  });
});
