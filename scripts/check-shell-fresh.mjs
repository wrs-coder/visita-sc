#!/usr/bin/env node
/**
 * Confere se as telas em dist-app/ são da versão atual do código antes de
 * copiá-las para o Android. `npx cap copy` sozinho copia o que estiver na
 * pasta — mesmo telas antigas — e o APK sai com número novo e telas velhas.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const infoFile = path.join(root, "dist-app", "build-info.json");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

function fail(msg) {
  console.error(
    `\n✖ ${msg}\n  Rode: npm run android:copy  (refaz as telas e copia para o Android)\n` +
      "  Não use `npx cap copy` sozinho: ele não refaz as telas.\n",
  );
  process.exit(1);
}

if (!existsSync(infoFile)) fail("dist-app/ não tem o carimbo de versão (build-info.json): as telas são antigas.");

let info;
try {
  info = JSON.parse(readFileSync(infoFile, "utf8"));
} catch {
  fail("Carimbo de versão em dist-app/ ilegível.");
}

if (info.version !== pkg.version) {
  fail(`As telas em dist-app/ são da versão ${info.version}, mas o app está na ${pkg.version}.`);
}

function newestMtime(dir) {
  let max = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) max = Math.max(max, newestMtime(full));
    else max = Math.max(max, statSync(full).mtimeMs);
  }
  return max;
}

const builtAt = Date.parse(info.builtAt);
const srcNewest = newestMtime(path.join(root, "src"));
// Folga de 2 min para relógios/cópias de arquivos.
if (Number.isFinite(builtAt) && srcNewest > builtAt + 2 * 60 * 1000) {
  fail(
    `O código foi alterado (${new Date(srcNewest).toLocaleString("pt-BR")}) depois das telas ` +
      `em dist-app/ (${new Date(builtAt).toLocaleString("pt-BR")}).`,
  );
}

console.log(`✅ Telas em dist-app/ conferidas: versão ${info.version}, geradas em ${new Date(builtAt).toLocaleString("pt-BR")}.`);
