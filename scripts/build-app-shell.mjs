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
import { createHash } from "node:crypto";

const root = process.cwd();
const outDir = path.join(root, "dist-app");
const LOGIN_SERVER_FN = {
  filename: "src/lib/auth.functions.ts",
  functionName: "resolveLoginIdentifier_createServerFn_handler",
};

function serverFunctionId(filename, functionName) {
  return createHash("sha256")
    .update(`${filename.replaceAll("\\", "/")}--${functionName}`)
    .digest("hex");
}

const EXPECTED_LOGIN_SERVER_FN_ID = serverFunctionId(
  LOGIN_SERVER_FN.filename,
  LOGIN_SERVER_FN.functionName,
);
const NATIVE_HTTP_BUNDLE_MARKER = "VISITASC_NATIVE_HTTP_V1";

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

/**
 * O preset Cloudflare/Nitro gera o worker (`index.mjs`) mas nem sempre um
 * `wrangler.json` ao lado dele. Sem esse arquivo o wrangler não sobe e a casca
 * acabava caindo na montagem estática — que produz tela preta no aparelho.
 */
async function ensureWranglerConfig(serverDir, assetsDir) {
  const file = path.join(serverDir, "wrangler.json");
  if (existsSync(file)) return;
  const config = {
    name: "visitasc-app-shell",
    main: "index.mjs",
    compatibility_date: "2025-09-24",
    compatibility_flags: ["nodejs_compat"],
    assets: { directory: path.relative(serverDir, assetsDir).split(path.sep).join("/") },
  };
  await writeFile(file, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  console.log("• wrangler.json da build criado para renderizar a casca.");
}

async function captureShellFromServer() {
  // Importante: o wrangler precisa rodar sobre a BUILD (dist/server/index.mjs),
  // e não sobre o wrangler.jsonc da raiz, que aponta para o código-fonte.
  const serverDir = SERVER_DIR_CANDIDATES.find((dir) => existsSync(path.join(dir, "index.mjs")));
  if (!serverDir) {
    throw new Error(
      "Build do servidor não encontrada (dist/server/index.mjs). Rode `npm run build` antes.",
    );
  }
  await ensureWranglerConfig(serverDir, clientDir);
  console.log(`• Renderizando a casca a partir de ${path.relative(root, serverDir)}…`);

  // O wrangler recusa rodar quando encontra o "deploy config" gerado na raiz
  // junto com o wrangler.json da build. Ele é recriado a cada build, então
  // pode ser removido com segurança aqui.
  const deployConfig = path.join(root, ".wrangler", "deploy", "config.json");
  await rmWithRetries(deployConfig);

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

/** Toda referência vira relativa: nada de caminho absoluto dentro do WebView. */
function toRelativeAssetPaths(html) {
  // Qualquer src/href que aponte para a raiz do site (assets, favicon, ícones)
  // vira relativo: dentro do APK não existe raiz de site, só a pasta do pacote.
  let out = html.replace(/(src|href)="\/(?!\/)([^"]*)"/g, '$1="./$2"');
  out = out.replace(/(src|href)='\/(?!\/)([^']*)'/g, "$1='./$2'");
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
  const normalize = (ref) => ref.replace(/^(\.\/|\/)+/, "");
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
      // Inclui imports estáticos e dinâmicos (anexos, arquivos, compartilhamento).
      for (const m of code.matchAll(/["'`]((?:\.?\/)?assets\/[\w./-]+\.(?:js|css))["'`]/g)) {
        queue.push(normalize(m[1]));
      }
    }
  }

  return { missing, checked: visited.size };
}

/** Impede a geração de APK/AAB com endereços de função incompatíveis. */
async function verifyLoginServerFunctionId(dir) {
  const files = await readdir(dir, { recursive: true });
  const javascriptFiles = files.filter((file) => file.endsWith(".js"));
  for (const relativeFile of javascriptFiles) {
    const source = await readFile(path.join(dir, relativeFile), "utf8");
    if (source.includes(EXPECTED_LOGIN_SERVER_FN_ID)) {
      console.log(`• Identificador do login conferido: ${EXPECTED_LOGIN_SERVER_FN_ID.slice(0, 12)}…`);
      return;
    }
  }
  throw new Error(
    "A casca não contém o identificador de login da publicação. " +
      "O APK/AAB seria incompatível; gere uma nova build antes de continuar.",
  );
}

/** Impede pacote Android sem a ponte HTTPS nativa que evita preflight CORS. */
async function verifyNativeHttpTransport(dir) {
  const files = await readdir(dir, { recursive: true });
  const javascriptFiles = files.filter((file) => file.endsWith(".js"));
  for (const relativeFile of javascriptFiles) {
    const source = await readFile(path.join(dir, relativeFile), "utf8");
    if (source.includes(NATIVE_HTTP_BUNDLE_MARKER) && source.includes("CapacitorHttp")) {
      console.log("• Transporte HTTPS nativo conferido.");
      return;
    }
  }
  throw new Error(
    "A casca não contém o transporte HTTPS nativo. " +
      "O APK/AAB continuaria sujeito a bloqueio CORS; gere uma nova build antes de continuar.",
  );
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
  await rmWithRetries(outDir, { recursive: true });
  await mkdir(outDir, { recursive: true });
  await cp(dir, outDir, { recursive: true });
  // Arquivos públicos (ícones, favicon, imagens) que o adaptador possa não ter
  // copiado: sem eles o app abre com 404 visíveis no console.
  const publicDir = path.join(root, "public");
  if (existsSync(publicDir)) {
    await cp(publicDir, outDir, { recursive: true, force: false, errorOnExist: false });
  }
  // Casca intermediária não deve ficar duplicada dentro do APK.
  await rmWithRetries(path.join(outDir, "_shell.html"));
  await rmWithRetries(path.join(outDir, "_shell"), { recursive: true });
  // O cache offline do site (service worker) não roda no app instalado e
  // qualquer resíduo dele volta a causar tela branca: não vai no pacote.
  await rmWithRetries(path.join(outDir, "sw.js"));
  await rmWithRetries(path.join(outDir, "manifest.webmanifest"));

  let html = await normalizeShell(shellHtml, outDir);
  html = toRelativeAssetPaths(html);
  await writeFile(path.join(outDir, "index.html"), html, "utf8");
  return html;
}

/**
 * O bundle do cliente inicia com `hydrate()`, que exige os dados de
 * inicialização (`$_TSR`) gravados pela renderização. Uma casca sem esses
 * dados lança "Invariant failed" logo no arranque — tela preta no aparelho.
 * Por isso a casca só é aceita se trouxer esses dados.
 */
function hasHydrationBootstrap(html) {
  return /\$_TSR/.test(html);
}

try {
  let shell = await readOfficialShell(clientDir);
  if (!shell) {
    shell = await captureShellFromServer();
  }

  const problems = validateShell(shell.html);
  if (!hasHydrationBootstrap(shell.html)) {
    problems.push(
      'não contém os dados de inicialização do app ($_TSR) — essa casca abriria em tela preta ("Invariant failed")',
    );
  }
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

  await verifyLoginServerFunctionId(outDir);
  await verifyNativeHttpTransport(outDir);

  // Saídas antigas só somem depois do pacote ficar pronto e validado.
  if (CLEAN_STALE) {
    for (const other of CLIENT_DIR_CANDIDATES) {
      if (other === usedDir) continue;
      if (!existsSync(other)) continue;
      try {
        await rmWithRetries(other, { recursive: true });
        console.log(`• Saída antiga removida: ${path.relative(root, other)}`);
      } catch (error) {
        // Pasta antiga travada (OneDrive/antivírus) não impede o pacote:
        // a saída mais recente já foi usada e validada. Apenas avisa.
        console.warn(
          `• Não consegui remover a saída antiga ${path.relative(root, other)} ` +
            `(${error?.code ?? error}). O pacote não é afetado; apague-a manualmente depois, se quiser.`,
        );
      }
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
