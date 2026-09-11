#!/usr/bin/env node
/**
 * Gera a "casca local" (SPA shell) usada pelo aplicativo Android.
 *
 * Fluxo:
 *  1. usa a build já existente em dist/ (rode `npm run build` antes);
 *  2. sobe o servidor da build localmente (wrangler dev) e captura o HTML de "/";
 *  3. copia dist/client + esse HTML como index.html para dist-app/.
 *
 * O resultado é uma pasta 100% estática que o Capacitor empacota dentro do APK
 * /AAB. Os dados continuam vindo dos domínios publicados, escolhidos em tempo
 * de execução por src/lib/api-origin.ts.
 */
import { spawn } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const clientDir = path.join(root, "dist", "client");
const outDir = path.join(root, "dist-app");
const PORT = Number(process.env.SHELL_PORT ?? 8788);

if (!existsSync(clientDir)) {
  console.error("✖ dist/client não encontrado. Rode `npm run build` primeiro.");
  process.exit(1);
}

const server = spawn("npx", ["wrangler", "dev", "--port", String(PORT), "--local"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});

const stop = () => {
  try {
    server.kill("SIGKILL");
  } catch {
    /* ignore */
  }
};
process.on("exit", stop);
process.on("SIGINT", () => {
  stop();
  process.exit(1);
});

async function waitForServer() {
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      if (res.ok) return await res.text();
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("O servidor local não respondeu a tempo.");
}

try {
  const html = await waitForServer();
  stop();

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(clientDir, outDir, { recursive: true });
  await writeFile(path.join(outDir, "index.html"), html, "utf8");

  console.log(`✅ Casca local gerada em dist-app/ (${(html.length / 1024).toFixed(1)} KB de HTML)`);
} catch (error) {
  stop();
  console.error("✖ Falha ao gerar a casca local:", error);
  process.exit(1);
}
