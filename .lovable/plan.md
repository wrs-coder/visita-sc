# Resolver o erro "EBUSY: resource busy or locked" ao gerar o pacote no Windows

## O que está acontecendo

Ao rodar `npm run android:release:apk`, a etapa de build precisa apagar a pasta `.output` para gerar uma nova. O Windows recusou com "recurso ocupado ou bloqueado". Isso não é defeito do aplicativo — é algo externo segurando arquivos da pasta. As causas conhecidas, em ordem de probabilidade:

1. **O projeto está dentro do OneDrive** (`C:\Users\wd-ro\OneDrive\Documentos\...`). O OneDrive trava arquivos enquanto sincroniza, e a build gera milhares de arquivos — conflito quase garantido. É a causa mais comum desse erro exato.
2. **Um servidor local de uma tentativa anterior ficou aberto.** O empacotamento sobe um servidor temporário a partir de `.output\server`. Se uma execução anterior foi interrompida (Ctrl+C, janela fechada), o processo pode ter ficado vivo segurando a pasta.
3. **Antivírus/Windows Defender** examinando os arquivos recém-gerados.

## O que será feito

1. **Encerrar processos travados antes de começar.** Adicionar um script `scripts/kill-stale-shell.mjs` que, no Windows, finaliza processos `wrangler`/`workerd` órfãos antes da build (via `taskkill`, silencioso quando não houver nenhum). Ele roda automaticamente no início de `app:package`.

2. **Apagar com tentativas e espera.** Criar uma função de remoção que, ao receber `EBUSY`/`EPERM`/`ENOTEMPTY`, aguarda e tenta de novo (até 5 vezes, com pausa crescente) — o tempo de o OneDrive/antivírus soltar o arquivo. Usada na limpeza de pastas antigas do empacotamento e na remoção do `dist-app`.

3. **Limpeza tolerante a falha.** Se mesmo após as tentativas uma pasta antiga continuar travada, o empacotamento **avisa e segue** em vez de abortar — a pasta antiga não impede o pacote, pois a escolha da saída mais recente já garante o conteúdo correto. Só falha de verdade se a pasta essencial (`dist-app`) não puder ser gravada.

4. **Recomendação (sua parte, 1 minuto):** pausar a sincronização do OneDrive enquanto gera o pacote, ou — melhor a longo prazo — mover a pasta do projeto para fora do OneDrive (ex.: `C:\projetos\visita-sc`). Isso elimina a causa raiz; os itens 1–3 são a rede de segurança.

Nada muda no site publicado, no banco de dados, no login, na sincronização offline ou nas telas. A alteração é apenas no empacotamento local do aplicativo.

## Detalhes técnicos

- Novo `scripts/kill-stale-shell.mjs`: no Windows, `taskkill /F /IM wrangler.exe /T` e `/IM workerd.exe /T` com saída suprimida; fora do Windows, `pkill -f "wrangler dev"` com falha ignorada. Registrado como passo `pre` do `app:package` no `package.json` (`"app:package": "node scripts/kill-stale-shell.mjs && npm run build && npm run app:shell"`).
- `scripts/build-app-shell.mjs`: nova função `rmWithRetries(alvo, { tentativas: 5 })` com backoff de 300ms→2400ms para `EBUSY`/`EPERM`/`ENOTEMPTY`; aplicada na remoção de `dist-app`, `sw.js`, `manifest.webmanifest`, pastas antigas e `.wrangler/deploy/config.json`.
- Limpeza de saídas antigas envolvida em `try/catch` com aviso, sem `process.exit(1)`.
- Sem mudança em `vite.config.ts`, `capacitor.config.ts`, versão ou Gradle.

## Depois de aprovado

No Windows: rode `npm run android:release:apk` (ou `:aab`) de novo. Se o erro persistir, pause a sincronização do OneDrive (ícone na bandeja → Pausar) e repita.
