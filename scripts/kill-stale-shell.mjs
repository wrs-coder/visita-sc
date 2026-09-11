#!/usr/bin/env node
/**
 * Finaliza processos órfãos de empacotamentos anteriores (wrangler/workerd)
 * que ficam segurando pastas da build no Windows e causam EBUSY/EPERM.
 * Falha silenciosa: se não houver nada para encerrar, segue normalmente.
 */
import { execSync } from "node:child_process";

function kill(cmd) {
  try {
    execSync(cmd, { stdio: "ignore" });
  } catch {
    /* processo inexistente ou já encerrado */
  }
}

if (process.platform === "win32") {
  kill("taskkill /F /IM workerd.exe /T");
  kill("taskkill /F /IM wrangler.exe /T");
  console.log("• Processos temporários de empacotamentos anteriores encerrados (Windows).");
} else {
  kill('pkill -f "wrangler dev"');
}
