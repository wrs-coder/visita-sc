#!/usr/bin/env node
/**
 * Monta a pasta `dist-app/` (casca local) empacotada pelo Capacitor no APK/AAB.
 *
 * Ordem de tentativa para obter o `index.html`:
 *   1. casca oficial gerada pelo prerender do TanStack Start (`_shell.html`);
 *   2. reserva: sobe o servidor da build (`wrangler dev`) e captura o HTML de "/".
 *
 * O arquivo só é aceito se for realmente uma página com script de inicialização.
 * Assim, uma build ruim falha aqui — nunca vira um APK de tela preta.
 */
import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "dist-app");
const PORT = Number(process.env.SHELL_PORT ?? 8788);

// A saída do cliente muda conforme o ambiente/adaptador.
const CLIENT_DIR_CANDIDATES = [
  path.join(root, "dist", "client"),
  path.join(root, ".output", "public"),
  path.join(root, "dist", "public"),
];

const clientDir = CLIENT_DIR_CANDIDATES.find((dir) => existsSync(dir));

if (!clientDir) {
  console.error(
    "✖ Saída do cliente não encontrada. Rode `npm run build` antes.\n  Procurei em:\n   - " +
      CLIENT_DIR_CANDIDATES.map((d) => path.relative(root, d)).join("\n   - "),
  );
  process.exit(1);
}

console.log(`• Usando a saída do cliente: ${path.relative(root, clientDir)}`);

/** A casca precisa ser uma página HTML que inicialize o app. */
function validateShell(html) {
  const problems = [];
  if (!/^\s*<!doctype html/i.test(html)) problems.push("não começa com <!DOCTYPE html>");
  if (!/<script/i.test(html)) problems.push("não contém nenhuma tag <script>");
  if (!/type="module"|type='module'/i.test(html)) problems.push('não contém <script type="module">');
  if (!/\/assets\//.test(html)) problems.push("não referencia nenhum bundle em /assets/");
  return problems;
}

const SHELL_CANDIDATES = [
  "_shell.html",
  path.join("_shell", "index.html"),
  "index.html",
];

async function readOfficialShell() {
  for (const rel of SHELL_CANDIDATES) {
    const file = path.join(clientDir, rel);
    if (!existsSync(file)) continue;
    const html = await readFile(file, "utf8");
    const problems = validateShell(html);
    if (problems.length === 0) {
      console.log(`• Casca oficial encontrada em ${rel}`);
      return { html, source: rel };
    }
    console.warn(`• ${rel} ignorado (${problems.join("; ")})`);
  }
  return null;
}

const SERVER_DIR_CANDIDATES = [
  path.join(root, "dist", "server"),
  path.join(root, ".output", "server"),
];

async function captureShellFromServer() {
  // Importante: o wrangler precisa rodar sobre a BUILD (dist/server/wrangler.json),
  // e não sobre o wrangler.jsonc da raiz, que aponta para o código-fonte.
  const serverDir = SERVER_DIR_CANDIDATES.find((dir) => existsSync(path.join(dir, "wrangler.json")));
  if (!serverDir) {
    throw new Error(
      "Build do servidor não encontrada (dist/server/wrangler.json). Rode `npm run build` antes.",
    );
  }
  console.log(`• Renderizando a casca a partir de ${path.relative(root, serverDir)}…`);

  // O wrangler recusa rodar quando encontra o "deploy config" gerado na raiz
  // junto com o wrangler.json da build. Ele é recriado a cada build, então
  // pode ser removido com segurança aqui.
  const deployConfig = path.join(root, ".wrangler", "deploy", "config.json");
  await rm(deployConfig, { force: true });

  const logs = [];
  const server = spawn("npx", ["wrangler", "dev", "--port", String(PORT), "--local"], {
    cwd: serverDir,
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (d) => logs.push(String(d)));
  server.stderr.on("data", (d) => logs.push(String(d)));

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

  try {
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`http://localhost:${PORT}/`, { headers: { Accept: "text/html" } });
        if (res.ok) {
          const type = res.headers.get("content-type") ?? "";
          const html = await res.text();
          if (type.includes("text/html")) return { html, source: "servidor local da build" };
          console.warn(`• Resposta inesperada (${type}); tentando de novo…`);
        }
      } catch {
        /* servidor ainda subindo */
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    console.error(logs.join("").slice(-2000));
    throw new Error("O servidor local não respondeu HTML a tempo (log acima).");
  } finally {
    stop();
  }
}


try {
  const shell = (await readOfficialShell()) ?? (await captureShellFromServer());
  const problems = validateShell(shell.html);
  if (problems.length > 0) {
    console.error(
      `✖ A casca obtida de "${shell.source}" não é válida:\n   - ${problems.join("\n   - ")}\n` +
        "  Nada foi empacotado. Rode `npm run build` novamente e repita.",
    );
    process.exit(1);
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(clientDir, outDir, { recursive: true });
  // Remove a casca intermediária para não ficar duplicada dentro do APK.
  await rm(path.join(outDir, "_shell.html"), { force: true });
  await rm(path.join(outDir, "_shell"), { recursive: true, force: true });
  await writeFile(path.join(outDir, "index.html"), shell.html, "utf8");

  const files = await readdir(outDir);
  if (!files.includes("index.html")) {
    console.error("✖ index.html não foi gravado em dist-app/.");
    process.exit(1);
  }

  console.log(
    `✅ Casca local pronta em dist-app/ (origem: ${shell.source}, ${(shell.html.length / 1024).toFixed(1)} KB).`,
  );
  process.exit(0);
} catch (error) {
  console.error("✖ Falha ao gerar a casca local:", error);
  process.exit(1);
}
