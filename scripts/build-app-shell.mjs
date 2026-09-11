#!/usr/bin/env node
/**
 * Monta a pasta `dist-app/` (casca local) empacotada pelo Capacitor no APK/AAB.
 *
 * Ordem de tentativa para obter o `index.html`:
 *   1. casca oficial gerada pelo prerender do TanStack Start (`_shell.html`);
 *   2. sobe o servidor da build (`wrangler dev`) e captura o HTML de "/";
 *   3. reserva: monta a casca estaticamente a partir dos arquivos já gerados
 *      (bundle em `assets/`), sem subprocesso algum — funciona em qualquer SO.
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
  // No Windows, `npx` é um arquivo .cmd: sem `shell: true` o spawn falha com ENOENT.
  const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
  const server = spawn(npxBin, ["wrangler", "dev", "--port", String(PORT), "--local"], {
    cwd: serverDir,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
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

/**
 * Reserva definitiva: monta a casca estaticamente a partir dos arquivos da
 * build, sem iniciar nenhum servidor. Funciona em Windows, Linux e macOS.
 */
async function buildStaticShell() {
  const assetsDir = path.join(clientDir, "assets");
  if (!existsSync(assetsDir)) {
    throw new Error("Pasta assets/ não encontrada na saída do cliente.");
  }

  let entryJs = null;
  let entryCss = null;
  /** Chunks estáticos importados pela entrada (para modulepreload). */
  let preload = [];

  // Preferência 1: manifesto do Vite, que aponta a entrada exata.
  const manifestPath = path.join(assetsDir, ".vite", "manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const entry = Object.values(manifest).find((item) => item && item.isEntry);
    if (entry?.file) {
      entryJs = entry.file.replace(/^\//, "");
      entryCss = Array.isArray(entry.css) ? entry.css[0] : null;
      const seen = new Set();
      const walk = (key) => {
        const item = manifest[key];
        if (!item || seen.has(key)) return;
        seen.add(key);
        if (item.file && item.file !== entry.file) preload.push(item.file.replace(/^\//, ""));
        for (const dep of item.imports ?? []) walk(dep);
      };
      for (const dep of entry.imports ?? []) walk(dep);
    }
  }

  // Preferência 2: varredura da pasta assets/ pelo padrão dos bundles do Vite.
  if (!entryJs) {
    const files = (await readdir(assetsDir)).filter((f) => f.endsWith(".js"));
    entryJs =
      files.find((f) => /^index-[\w-]+\.js$/.test(f)) ?? files.sort().at(-1) ?? null;
    if (entryJs) entryJs = `assets/${entryJs}`;
  }
  if (!entryCss) {
    const cssFiles = (await readdir(assetsDir)).filter((f) => f.endsWith(".css"));
    if (cssFiles.length > 0) entryCss = `assets/${cssFiles.sort().at(-1)}`;
  }

  if (!entryJs) {
    throw new Error("Nenhum bundle de entrada (*.js) encontrado em assets/.");
  }

  const favicon = existsSync(path.join(clientDir, "favicon.svg"))
    ? '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />'
    : existsSync(path.join(clientDir, "favicon.ico"))
      ? '<link rel="icon" href="/favicon.ico" />'
      : "";
  const manifest = existsSync(path.join(clientDir, "manifest.webmanifest"))
    ? '<link rel="manifest" href="/manifest.webmanifest" />'
    : "";
  const stylesheet = entryCss ? `<link rel="stylesheet" href="/${entryCss}" />` : "";

  const html = [
    "<!DOCTYPE html>",
    '<html lang="pt-BR">',
    "  <head>",
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />',
    "    <title>Visita SC</title>",
    favicon && `    ${favicon}`,
    manifest && `    ${manifest}`,
    stylesheet && `    ${stylesheet}`,
    // Carregamento direto (sem import() dinâmico): falhas ficam visíveis e
    // o WebView do Capacitor não depende de um passo assíncrono extra.
    ...preload.map((file) => `    <link rel="modulepreload" href="/${file}" />`),
    `    <script type="module" src="/${entryJs}"></script>`,
    "  </head>",
    "  <body>",
    '    <div id="root"></div>',
    "  </body>",
    "</html>",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  return { html, source: "montagem estática dos arquivos da build" };
}

/**
 * Conferência obrigatória: todo arquivo /assets/... citado na casca (e nos
 * imports estáticos dos chunks citados) precisa existir dentro de dist-app.
 * Sem isso, um pacote incompleto vira tela branca no aparelho.
 */
async function verifyPackagedAssets(dir, html) {
  const missing = [];
  const visited = new Set();
  const queue = [...html.matchAll(/\/assets\/[\w./-]+\.(?:js|css)/g)].map((m) => m[0]);

  while (queue.length > 0) {
    const ref = queue.shift();
    if (visited.has(ref)) continue;
    visited.add(ref);
    const file = path.join(dir, ref.replace(/^\//, ""));
    if (!existsSync(file)) {
      missing.push(ref);
      continue;
    }
    if (ref.endsWith(".js")) {
      const code = await readFile(file, "utf8");
      for (const m of code.matchAll(/["'`](\/assets\/[\w./-]+\.(?:js|css))["'`]/g)) {
        queue.push(m[1]);
      }
    }
  }

  return { missing, checked: visited.size };
}


try {
  let shell = await readOfficialShell();
  if (!shell) {
    try {
      shell = await captureShellFromServer();
    } catch (error) {
      console.warn(`• Servidor local indisponível (${error.message ?? error}).`);
      console.warn("• Usando a montagem estática como alternativa…");
      shell = await buildStaticShell();
    }
  }

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

  const { missing, checked } = await verifyPackagedAssets(outDir, shell.html);
  if (missing.length > 0) {
    console.error(
      "✖ Arquivos citados pela casca não existem em dist-app/:\n   - " +
        missing.join("\n   - ") +
        "\n  Nada foi empacotado com segurança. Rode `npm run build` novamente e repita.",
    );
    process.exit(1);
  }

  console.log(
    `✅ Casca local pronta em dist-app/ (origem: ${shell.source}, ${(shell.html.length / 1024).toFixed(1)} KB, ${checked} arquivos conferidos).`,
  );

  process.exit(0);
} catch (error) {
  console.error("✖ Falha ao gerar a casca local:", error);
  process.exit(1);
}
