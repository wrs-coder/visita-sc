# Importação da Bíblia some no Android — correção defensiva

## Diagnóstico

Toast "Bíblia importada" aparece mas a lista em "Gerenciar Bíblia" fica vazia. Isso indica que a gravação no IndexedDB **aparentou** sucesso mas o registro não está lá quando `listLibraries()` lê de volta. Causa mais provável no Android WebView (APK usando `server.url` remoto):

1. **Storage não persistido**: o Android pode descartar IndexedDB/localStorage do WebView sem aviso quando o app não chama `navigator.storage.persist()`. Afeta poucos usuários (depende de pressão de armazenamento / configurações). Explica perfeitamente "importou e sumiu".
2. **Quota/transação abortada silenciosamente** em chunks intermediários em WebViews antigos.
3. (Menos provável) localStorage bloqueado — afetaria só o "ativo", a lib continuaria aparecendo na lista.

A estratégia abaixo cobre os 3 cenários sem mexer no parser EPUB, no schema do IndexedDB nem no fluxo de quem já usa.

## Mudanças (apenas 2 arquivos)

### 1. `src/lib/bible-notes-store.ts` — robustez na importação

Dentro de `importEpub` (após `openDB()`, antes do loop de chunks):

- **Pedir persistência ao SO** (best-effort, silencioso):
  ```ts
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch { /* noop */ }
  ```
  Isso sinaliza ao Android WebView que o store **não** deve ser descartado.

- **Checar quota** antes de começar a escrever (best-effort):
  ```ts
  try {
    const est = await navigator.storage?.estimate?.();
    if (est?.quota && est?.usage && est.quota - est.usage < 30 * 1024 * 1024) {
      throw new Error("QUOTA_LOW");
    }
  } catch (e) { if ((e as Error).message === "QUOTA_LOW") throw e; }
  ```

Depois do bloco que grava metadados (linha ~377), **adicionar verificação read-back**:

```ts
// Confirma que o registro realmente persistiu (Android WebView às vezes
// aborta silenciosamente). Se sumiu, lança erro para o catch existente
// disparar removeLibrary() e a UI mostrar erro real ao usuário.
const persisted = await new Promise<BibleLibrary | undefined>((resolve, reject) => {
  const tx = db.transaction(STORE_LIBRARIES, "readonly");
  const req = tx.objectStore(STORE_LIBRARIES).get(id);
  req.onsuccess = () => resolve(req.result as BibleLibrary | undefined);
  req.onerror = () => reject(req.error);
});
if (!persisted) {
  throw new Error("PERSIST_FAILED: gravação não confirmada após escrita.");
}
```

Substituir o catch genérico para preservar a mensagem original (em vez de só relançar) e logar detalhes via `console.warn` para o DevTools dos próximos relatos.

### 2. `src/components/bible/BibleManagerDialog.tsx` — mensagem clara + diagnóstico

No `handlePickFile`, no `catch (err)` (linhas 85-90):

- Diferenciar mensagens por causa:
  - `PERSIST_FAILED` → "O Android descartou o armazenamento. Vá em Configurações > Apps > Visita SC > Armazenamento e marque como 'não otimizar', depois tente novamente."
  - `QUOTA_LOW` → "Espaço insuficiente no dispositivo para importar essa Bíblia."
  - outros → mensagem atual.
- `console.error` com `err.message`, `err.name`, `navigator.userAgent`, e resultado de `navigator.storage.estimate()` — assim, se outro usuário reportar, conseguimos ler nos logs do remote inspector.

Depois de `await refresh()`, **se `libs.length === 0` mesmo após sucesso**, mostrar toast de alerta pedindo para reabrir a tela (cenário raro de race).

## Fora do escopo (intencional)

- Parser EPUB (`epub-bible-parser.ts`) — sem mudanças. Os 2 usuários receberam toast de sucesso, então o parser funcionou.
- Schema do IndexedDB, `STORE_BIBLES`, `STORE_LIBRARIES`, `LS_ACTIVE_LIBRARY` — sem mudanças. Quem já tem Bíblia importada continua funcionando.
- UI/UX dos outros usuários — sem mudança visível para 99% dos casos.
- Capacitor / `server.url` / migração para bundle offline — não toca.

## Validação

- Build passa sem erro de tipos.
- Fluxo feliz (web e Android com storage saudável): importa, mostra toast, aparece em "Gerenciar Bíblia", igual hoje.
- Cenário de falha simulado (DevTools → Application → IndexedDB → Clear durante import): toast de erro com mensagem acionável em vez do antigo falso-positivo.
- Próximo relato vai trazer `console.error` com a causa raiz exata via `userAgent` + `storage.estimate()`.

## Riscos

Baixos. As chamadas a `navigator.storage.persist/estimate` são opcionais (encapsuladas em try/catch). A verificação read-back custa 1 transação readonly extra (~ms). Nenhuma migração de dados.