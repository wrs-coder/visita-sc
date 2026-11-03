import { describe, it, expect } from "vitest";
import { sanitizeIntlPhone, isValidEmail, telHref } from "./contact-format";

describe("contact-format", () => {
  it("aceita número estrangeiro", () => {
    expect(sanitizeIntlPhone("+351 912 345 678")).toBe("+351 912 345 678");
  });
  it("remove letras", () => {
    expect(sanitizeIntlPhone("+1 (555) abc-1234")).toBe("+1 (555) -1234");
  });
  it("limita a 30 caracteres", () => {
    expect(sanitizeIntlPhone("1".repeat(40))).toHaveLength(30);
  });
  it("tel href só dígitos e +", () => {
    expect(telHref("+351 (912) 345-678")).toBe("tel:+351912345678");
  });
  it("e-mail vazio é válido, incompleto não", () => {
    expect(isValidEmail("")).toBe(true);
    expect(isValidEmail("joao@")).toBe(false);
    expect(isValidEmail("joao@jwhub.org")).toBe(true);
  });
});
