/**
 * Rede de segurança do arranque (especialmente no app instalado).
 *
 * Se o app falhar antes de montar qualquer tela — casca incompleta, pedaço de
 * código que não carregou, erro logo no início — o usuário via apenas uma tela
 * preta, sem nenhuma pista. Aqui:
 *  - erros e rejeições do arranque ficam registrados;
 *  - se nada tiver sido desenhado depois de alguns segundos, mostramos um aviso
 *    legível com botão "Tentar novamente".
 *
 * Nada disso interfere no app quando ele abre normalmente: assim que a primeira
 * tela monta, a rede é desarmada.
 */

const BOOT_TIMEOUT_MS = 12_000;

let armed = false;
let mounted = false;
let bootError: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function escape(text: string): string {
  return text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
}

function showFallback() {
  if (mounted || typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;
  // Já existe algo desenhado? Então o app abriu — nada a fazer.
  if (body.innerText.trim().length > 0) return;
  if (document.getElementById("boot-guard")) return;

  const box = document.createElement("div");
  box.id = "boot-guard";
  box.setAttribute(
    "style",
    "position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;" +
      "justify-content:center;gap:16px;padding:24px;background:#ffffff;color:#0f172a;" +
      "font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;",
  );
  box.innerHTML =
    '<div style="font-size:18px;font-weight:600">Não foi possível abrir o aplicativo</div>' +
    '<div style="font-size:14px;max-width:32rem;line-height:1.5">' +
    "Feche e abra novamente. Se continuar assim, reinstale a última versão." +
    "</div>" +
    (bootError
      ? `<div style="font-size:12px;opacity:.7;max-width:32rem;word-break:break-word">${escape(bootError)}</div>`
      : "") +
    '<button id="boot-guard-retry" style="margin-top:8px;padding:10px 18px;border-radius:8px;border:0;' +
    'background:#1e3a8a;color:#fff;font-size:14px;font-weight:600">Tentar novamente</button>';
  body.appendChild(box);
  document.getElementById("boot-guard-retry")?.addEventListener("click", () => {
    window.location.reload();
  });
}

/** Chamado pela raiz assim que a primeira tela monta. */
export function markAppMounted() {
  mounted = true;
  if (timer) clearTimeout(timer);
  timer = null;
  document.getElementById("boot-guard")?.remove();
}

export function armBootGuard() {
  if (armed || typeof window === "undefined") return;
  armed = true;

  window.addEventListener("error", (ev) => {
    if (mounted) return;
    bootError = String(ev.message ?? ev.error ?? "");
    showFallback();
  });
  window.addEventListener("unhandledrejection", (ev) => {
    if (mounted) return;
    const reason = ev.reason as { message?: string } | undefined;
    bootError = String(reason?.message ?? ev.reason ?? "");
  });

  timer = setTimeout(showFallback, BOOT_TIMEOUT_MS);
}
