# Aviso de atualização da Play Store + botão para fechar o aviso "Sem conexão"

## (1) Notificação amigável de nova versão na Play Store

**Como funciona:** o aplicativo instalado não consegue "perguntar" diretamente à Play Store qual é a versão mais recente (isso exigiria uma conta de serviço do Google com chave própria). O caminho simples e confiável é o app comparar a própria versão com a versão mais recente publicada no nosso site:

1. **Endpoint público de versão** — novo `src/routes/api/public/version.ts` retornando `{ "latest": "4.2.11", "minSupported": "4.2.0" }` (lido de uma constante no código, atualizada a cada release junto com o bump de versão).
2. **Verificação no app** — novo `src/lib/app-update-check.ts`: ao abrir o app instalado (e ao voltar para foreground, com intervalo mínimo de 6h), busca o endpoint usando a origem dinâmica já existente (`api-origin.ts`). Compara versões semanticamente.
3. **Aviso amigável** — novo componente `AppUpdatePrompt.tsx`:
   - Se `latest` > versão instalada: cartão discreto no rodapé (ou diálogo uma vez por dia) — "Nova versão disponível" + botão **"Atualizar na Play Store"** (abre `market://details?id=com.waorodrigues.visitasc`, com fallback para o link https) + botão **"Agora não"**.
   - Se `minSupported` > versão instalada: aviso mais firme (não bloqueia o uso, mas reaparece a cada abertura).
   - Nunca aparece offline, no navegador ou no preview — só no app instalado com rede.
4. **Sem notificação push** (exigiria servidor de push/FCM). O aviso aparece quando o usuário abre o app — cobre o cenário pedido sem infraestrutura nova.

## (2) Botão de fechar/minimizar o aviso "Sem conexão com o servidor"

O aviso fixo no rodapé é o `AppOriginDiagnostics.tsx`. Ajustes:

- Adicionar botão **X (fechar)** ao lado do botão "Tentar".
- Ao fechar: o banner some e vira um **mini-indicador flutuante** (ícone de nuvem cortada, ~36px, canto inferior direito, acima do conteúdo) — tocar nele reabre o banner completo.
- A verificação em segundo plano continua normalmente; quando a conexão voltar, o mini-indicador desaparece sozinho.
- Estado "fechado" vale só para a sessão atual (não persiste), para o aviso reaparecer na próxima abertura se ainda estiver sem servidor.

## Arquivos

- Novo: `src/routes/api/public/version.ts`
- Novo: `src/lib/app-update-check.ts`
- Novo: `src/components/AppUpdatePrompt.tsx` (montado em `src/routes/__root.tsx`)
- Editado: `src/components/AppOriginDiagnostics.tsx` (botão fechar + mini-indicador)
- Traduções pt/en/es nos 3 arquivos de locale

## Validação

- `bunx tsgo --noEmit` e `bunx vitest run` (incluindo teste novo para a comparação de versões).
- No app instalado, as mudanças só aparecem após gerar e instalar novo APK/AAB.
