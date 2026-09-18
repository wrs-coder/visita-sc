import { describe, expect, it } from "vitest";
import { generatePortableServerFunctionId } from "./server-function-id";

const functionName = "resolveLoginIdentifier_createServerFn_handler";
const publishedId = "f5e176a0b59a0de1d12d569a9bc9feb26dd3913711149c802c368e3803869a22";

describe("generatePortableServerFunctionId", () => {
  it("gera o identificador publicado para caminhos POSIX", () => {
    expect(
      generatePortableServerFunctionId({ filename: "src/lib/auth.functions.ts", functionName }),
    ).toBe(publishedId);
  });

  it("gera o mesmo identificador para caminhos Windows", () => {
    expect(
      generatePortableServerFunctionId({ filename: "src\\lib\\auth.functions.ts", functionName }),
    ).toBe(publishedId);
  });
});