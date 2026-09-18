import { createHash } from "node:crypto";

/**
 * Gera o mesmo identificador em Linux, macOS e Windows.
 * O servidor publicado usa caminhos POSIX; por isso normalizamos antes do hash.
 */
export function generatePortableServerFunctionId({
  filename,
  functionName,
}: {
  filename: string;
  functionName: string;
}): string {
  const portableFilename = filename.replaceAll("\\", "/");
  return createHash("sha256")
    .update(`${portableFilename}--${functionName}`)
    .digest("hex");
}