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
 * O arquivo só é aceito se for realmente uma página com script de inicialização
 * e se TODOS os arquivos citados existirem dentro de `dist-app/`.
 */
import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile, readdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "dist-app");

/**
 * No Windows, OneDrive/antivírus/processos recém-encerrados seguram arquivos
 * por alguns instantes (EBUSY/EPERM/ENOTEMPTY). Aguarda e tenta de novo.
 */
async function rmWithRetries(target, options = {}, tentativas = 5) {
  const opts = { force: true, ...options };
  for (let i = 0; ; i++) {
    try {
      return await rm(target, opts);
    } catch (error) {
      const code = error?.code ?? "";
      if (!["EBUSY", "EPERM", "ENOTEMPTY"].includes(code) || i >= tentativas - 1) throw error;
      await new Promise((r) => setTimeout(r, 300 * 2 ** i));
    }
  }
}
const PORT = Number(process.env.SHELL_PORT ?? 8788);
const CLEAN_STALE = !process.argv.includes("--no-clean-stale");

// A saída do cliente muda conforme o ambiente/adaptador.
const CLIENT_DIR_CANDIDATES = [
  path.join(root, "dist", "client"),
  path.join(root, ".output", "public"),
  path.join(root, "dist", "public"),
];

const existingCandidates = CLIENT_DIR_CANDIDATES.filter((dir) => existsSync(dir));

if (existingCandidates.length === 0) {
  console.error(
    "✖ Saída do cliente não encontrada. Rode `npm run build` antes.\n  Procurei em:\n   - " +
      CLIENT_DIR_CANDIDATES.map((d) => path.relative(root, d)).join("\n   - "),
  );
  process.exit(1);
}

/** Escolhe a saída mais recente: pastas antigas de builds anteriores enganam. */
const ranked = existingCandidates
  .map((dir) => ({ dir, mtime: statSync(dir).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

const clientDir = ranked[0].dir;
const otherCandidates = ranked.slice(1).map((r) => r.dir);

console.log(
  `• Saída do cliente escolhida: ${path.relative(root, clientDir)} (modificada em ${new Date(
    ranked[0].mtime,
  ).toISOString()})`,
);
for (const other of otherCandidates) {
  console.log(`  ↳ ignorando saída mais antiga: ${path.relative(root, other)}`);
}

/** A casca precisa ser uma página HTML que inicialize o app. */
function validateShell(html) {
  const problems = [];
  if (!/^\s*<!doctype html/i.test(html)) problems.push("não começa com <!DOCTYPE html>");
  if (!/<script/i.test(html)) problems.push("não contém nenhuma tag <script>");
  if (!/type="module"|type='module'/i.test(html)) problems.push('não contém <script type="module">');
  if (!/assets\//.test(html)) problems.push("não referencia nenhum bundle em assets/");
  return problems;
}

const SHELL_CANDIDATES = [
  "_shell.html",
  path.join("_shell", "index.html"),
  "index.html",
];

async function readOfficialShell(dir) {
  for (const rel of SHELL_CANDIDATES) {
    const file = path.join(dir, rel);
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

  const deadline = Date.now() + 120_000;
  try {
    while (Date.now() < deadline) {
      try {
        // Timeout por tentativa: sem isso, um servidor que aceita a conexão e
        // nunca responde deixa o empacotamento pendurado para sempre.
        const res = await fetch(`http://localhost:${PORT}/`, {
          headers: { Accept: "text/html" },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const type = res.headers.get("content-type") ?? "";
          const html = await res.text();
          if (type.includes("text/html")) return { html, source: "servidor local da build" };
          console.warn(`• Resposta inesperada (${type}); tentando de novo…`);
        }
      } catch {
        /* servidor ainda subindo ou sem resposta */
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
async function buildStaticShell(dir) {
  const assetsDir = path.join(dir, "assets");
  if (!existsSync(assetsDir)) {
    throw new Error("Pasta assets/ não encontrada na saída do cliente.");
  }

  let entryJs = null;
  let entryCss = null;
  /** Chunks estáticos importados pela entrada (para modulepreload). */
  const preload = [];

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

  // Preferência 2: identificar a entrada real pelo conteúdo — é o bundle que
  // inicia o React (hydrateRoot/createRoot) e que nenhum outro arquivo importa.
  if (!entryJs) {
    const files = (await readdir(assetsDir)).filter((f) => f.endsWith(".js"));
    const imported = new Set();
    const sources = new Map();
    for (const file of files) {
      const code = await readFile(path.join(assetsDir, file), "utf8");
      sources.set(file, code);
      for (const m of code.matchAll(/["'`]\.?\/?assets\/([\w.-]+\.js)["'`]/g)) imported.add(m[1]);
    }
    const roots = files.filter((f) => !imported.has(f));
    const startsReact = (f) => /hydrateRoot|createRoot\s*\(/.test(sources.get(f) ?? "");
    entryJs =
      roots.find(startsReact) ??
      files.find(startsReact) ??
      roots.find((f) => /^index-[\w-]+\.js$/.test(f)) ??
      files.find((f) => /^index-[\w-]+\.js$/.test(f)) ??
      null;
    if (entryJs) {
      // Pré-carrega os imports diretos da entrada para acelerar a abertura.
      const code = sources.get(entryJs) ?? "";
      for (const m of code.matchAll(/from\s*["'`]\.?\/?assets\/([\w.-]+\.js)["'`]/g)) {
        preload.push(`assets/${m[1]}`);
      }
      entryJs = `assets/${entryJs}`;
    }
  }

  if (!entryCss) {
    const cssFiles = (await readdir(assetsDir)).filter((f) => f.endsWith(".css"));
    if (cssFiles.length > 0) entryCss = `assets/${cssFiles.sort().at(-1)}`;
  }

  if (!entryJs) {
    throw new Error("Nenhum bundle de entrada (*.js) encontrado em assets/.");
  }

  const favicon = existsSync(path.join(dir, "favicon.svg"))
    ? '<link rel="icon" href="./favicon.svg" type="image/svg+xml" />'
    : existsSync(path.join(dir, "favicon.ico"))
      ? '<link rel="icon" href="./favicon.ico" />'
      : "";
  const stylesheet = entryCss ? `<link rel="stylesheet" href="./${entryCss}" />` : "";

  const html = [
    "<!DOCTYPE html>",
    '<html lang="pt-BR">',
    "  <head>",
    '    <meta charset="UTF-8" />',
    '    <base href="./" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />',
    "    <title>Visita SC</title>",
    favicon && `    ${favicon}`,
    stylesheet && `    ${stylesheet}`,
    // Carregamento direto (sem import() dinâmico): falhas ficam visíveis e
    // o WebView do Capacitor não depende de um passo assíncrono extra.
    ...preload.map((file) => `    <link rel="modulepreload" href="./${file}" />`),
    `    <script type="module" src="./${entryJs}"></script>`,
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

/** Toda referência vira relativa: nada de caminho absoluto dentro do WebView. */
function toRelativeAssetPaths(html) {
  let out = html.replace(/(src|href)="\/(assets\/[^"]+)"/g, '$1="./$2"');
  out = out.replace(/(src|href)='\/(assets\/[^']+)'/g, "$1='./$2'");
  // O manifest do PWA não vai no pacote nativo: remover o link evita um 404.
  out = out.replace(/<link[^>]+rel=["']manifest["'][^>]*>/gi, "");
  if (!/<base\s/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, '<head$1><base href="./" />');
  }
  return out;
}


/**
 * Conferência obrigatória: todo arquivo assets/... citado na casca (e nos
 * imports estáticos dos chunks citados) precisa existir dentro de dist-app.
 */
async function verifyPackagedAssets(dir, html) {
  const missing = [];
  const visited = new Set();
  const normalize = (ref) => ref.replace(/^\.?\//, "");
  const queue = [...html.matchAll(/\.?\/?assets\/[\w./-]+\.(?:js|css)/g)].map((m) => normalize(m[0]));

  while (queue.length > 0) {
    const ref = queue.shift();
    if (visited.has(ref)) continue;
    visited.add(ref);
    const file = path.join(dir, ref);
    if (!existsSync(file)) {
      missing.push(ref);
      continue;
    }
    if (ref.endsWith(".js")) {
      const code = await readFile(file, "utf8");
      for (const m of code.matchAll(/["'`](\.?\/assets\/[\w./-]+\.(?:js|css))["'`]/g)) {
        queue.push(normalize(m[1]));
      }
    }
  }

  return { missing, checked: visited.size };
}

/**
 * Troca o `import()` dinâmico da casca por um <script type="module" src>
 * estático e pré-carrega os chunks de primeiro nível.
 */
async function normalizeShell(html, dir) {
  const re =
    /<script type="module"[^>]*>\s*import\(\s*["'](\.?\/?assets\/[\w./-]+\.js)["']\s*\)\s*;?\s*<\/script>/i;
  const match = html.match(re);
  if (!match) return html;
  const entry = match[1].replace(/^\.?\//, "");

  const preload = new Set();
  const entryFile = path.join(dir, entry);
  if (existsSync(entryFile)) {
    const code = await readFile(entryFile, "utf8");
    for (const m of code.matchAll(/from\s*["'](\.?\/?assets\/[\w./-]+\.js)["']/g))
      preload.add(m[1].replace(/^\.?\//, ""));
    for (const m of code.matchAll(/import\s*["'](\.?\/?assets\/[\w./-]+\.js)["']/g))
      preload.add(m[1].replace(/^\.?\//, ""));
  }

  const links = [...preload]
    .map((file) => `<link rel="modulepreload" href="./${file}" />`)
    .join("");
  return html.replace(re, `${links}<script type="module" src="./${entry}"></script>`);
}

/** Copia a saída escolhida para dist-app e grava a casca. */
async function assemble(dir, shellHtml) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(dir, outDir, { recursive: true });
  // Casca intermediária não deve ficar duplicada dentro do APK.
  await rm(path.join(outDir, "_shell.html"), { force: true });
  await rm(path.join(outDir, "_shell"), { recursive: true, force: true });
  // O cache offline do site (service worker) não roda no app instalado e
  // qualquer resíduo dele volta a causar tela branca: não vai no pacote.
  await rm(path.join(outDir, "sw.js"), { force: true });
  await rm(path.join(outDir, "manifest.webmanifest"), { force: true });

  let html = await normalizeShell(shellHtml, outDir);
  html = toRelativeAssetPaths(html);
  await writeFile(path.join(outDir, "index.html"), html, "utf8");
  return html;
}

try {
  let shell = await readOfficialShell(clientDir);
  if (!shell) {
    try {
      shell = await captureShellFromServer();
    } catch (error) {
      console.warn(`• Servidor local indisponível (${error.message ?? error}).`);
      console.warn("• Usando a montagem estática como alternativa…");
      shell = await buildStaticShell(clientDir);
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

  let usedDir = clientDir;
  let html = await assemble(usedDir, shell.html);

  const files = await readdir(outDir);
  if (!files.includes("index.html")) {
    console.error("✖ index.html não foi gravado em dist-app/.");
    process.exit(1);
  }

  let { missing, checked } = await verifyPackagedAssets(outDir, html);

  // Correção automática: a casca pode ter vindo de uma build cujos arquivos
  // estão em outra pasta candidata. Se todos os faltantes existirem lá,
  // refazemos a cópia a partir dela e revalidamos uma única vez.
  if (missing.length > 0) {
    for (const candidate of otherCandidates) {
      const allThere = missing.every((ref) => existsSync(path.join(candidate, ref)));
      if (!allThere) continue;
      console.warn(
        `• Arquivos faltando em ${path.relative(root, usedDir)}; recopiando de ${path.relative(root, candidate)}…`,
      );
      usedDir = candidate;
      html = await assemble(usedDir, shell.html);
      ({ missing, checked } = await verifyPackagedAssets(outDir, html));
      break;
    }
  }

  if (missing.length > 0) {
    console.error(
      `✖ Arquivos citados pela casca (origem: ${shell.source}) não existem em dist-app/ ` +
        `(copiado de ${path.relative(root, usedDir)}):\n   - ` +
        missing.join("\n   - ") +
        "\n  Nada foi empacotado com segurança. Apague dist/ e .output/, rode `npm run build` e repita.",
    );
    process.exit(1);
  }

  // Saídas antigas só somem depois do pacote ficar pronto e validado.
  if (CLEAN_STALE) {
    for (const other of CLIENT_DIR_CANDIDATES) {
      if (other === usedDir) continue;
      if (!existsSync(other)) continue;
      await rm(other, { recursive: true, force: true });
      console.log(`• Saída antiga removida: ${path.relative(root, other)}`);
    }
  }

  console.log(
    `✅ Casca local pronta em dist-app/ (origem: ${shell.source}, copiada de ${path.relative(
      root,
      usedDir,
    )}, ${(html.length / 1024).toFixed(1)} KB, ${checked} arquivos conferidos).`,
  );

  process.exit(0);
} catch (error) {
  console.error("✖ Falha ao gerar a casca local:", error);
  process.exit(1);
}
