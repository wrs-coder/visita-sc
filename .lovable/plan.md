# Importar .etim / Circuito Manager no APK: diagnóstico e solução

## O que está acontecendo (causa confirmada)

O APK instalado no celular ainda leva as telas antigas, de antes da correção. Os dois sintomas batem exatamente com o código antigo:

| Sintoma no celular | Código antigo | Código atual |
|---|---|---|
| .etim aparece mas fica cinza | botão aceitava só `.etim` e `application/json`; o Android chama o .etim de ".bin" e bloqueia | aceita também `application/octet-stream` (o mesmo que faz o JW Library funcionar) |
| .json fica selecionável mas diz "Arquivo .etim sem partes" | o app lia tudo como .etim, sem reconhecer o Circuito Manager | reconhece o Circuito Manager pela lista "Programas" e importa as partes |

Conferi com o seu arquivo real "Feliz É Aquele Que Confia em Jeová.json": o código atual o lê sem erro (há teste automático com ele). A mensagem "Arquivo .etim sem partes" nem é mais usada para arquivos do Circuito Manager.

Por que o APK ficou velho:
- Na minha resposta anterior, indiquei o comando `npm run build:app`, que **não existe** no projeto. Erro meu.
- A versão continuou 5.0.5 depois da correção, então a trava que impede telas velhas (compara versão + data do código) pode não ter disparado se as telas foram geradas antes de baixar o código novo.
- Se o código foi baixado do GitHub antes da correção, o APK também sai sem ela.

## Solução

### 1. Passo a passo correto para gerar o APK (para você)

```text
1) Baixar o código mais recente     git pull
2) Refazer telas + copiar Android   npm run android:build
3) Gerar APK de teste               cd android  →  gradlew.bat assembleDebug (Windows)
                                                  ./gradlew assembleDebug  (Mac/Linux)
4) Instalar: android/app/build/outputs/apk/debug/app-debug.apk
5) Conferir no celular: Configurações → Sobre → "Versão 5.0.6 · gerado em <data de hoje>"
```

Se a data em "Sobre" não for a de hoje, o APK ainda está com telas antigas.

### 2. Ajustes no app (blindagem)

- **Subir para a versão 5.0.6** (Android versionCode 35), com novidade curta no "O que há de novo": "Importar programa de Grandes Eventos (.etim e Circuito Manager) corrigido no Android". Com o número novo, a trava do empacotamento obriga a refazer as telas — impossível sair APK velho com o número novo.
- **Botão Importar mais permissivo no Android:** além da lista atual, aceitar qualquer arquivo no seletor e conferir a extensão (.etim/.json) e o conteúdo depois de escolhido. Assim, mesmo gerenciadores de arquivos que chamam o .etim de outro tipo (Samsung "Meus arquivos", Google Drive, WhatsApp) deixam selecionar. Arquivo errado continua recusado com mensagem clara.
- **Mensagens de erro mais úteis:** trocar "Arquivo .etim sem partes" por "Não encontrei partes neste arquivo. Use o .etim do JW Hub ou o .json do Circuito Manager." e incluir o nome do arquivo escolhido, para facilitar o diagnóstico.
- **Corrigir o guia de geração do APK** (ANDROID_RELEASE.md) com o passo a passo acima, deixando claro que `npx cap copy` sozinho ou comandos inexistentes geram APK com telas antigas.

### Mockup (sem mudança de layout)

```text
┌──────────────────────────────┐
│ Circuito                     │
│ (Itinerário)(Congreg.)(Grandes Eventos)
│ ──────────────────────────── │
│ [⬆ Importar .etim / .json] [+ Novo]
│                              │
│  Seletor do Android:         │
│   Assembleia_2027.etim  ✔    │  ← antes ficava cinza
│   Feliz_É_Aquele.json   ✔    │
│                              │
│  ✔ 20 partes encontradas     │
│  ou                          │
│  ⚠ Não encontrei partes em   │
│    "foto.jpg". Use o .etim   │
│    ou o .json do Circuito    │
│    Manager.                  │
└──────────────────────────────┘
```

## O que não muda
- Formato das partes salvas, convites, links/PIN, banco de dados e regras de acesso.
- Importação do JW Library e do itinerário.

## Detalhes técnicos
- `BigEvents.tsx`: `accept` passa a omitir o filtro restritivo (ou `*/*`), mantendo a validação por extensão + `parseProgramFile`; erro inclui `f.name`.
- `etim-import.ts`: textos de erro genéricos; lógica de detecção inalterada.
- Versão 5.0.6 em `package.json`, `android/app/build.gradle` (versionCode 35), `app-update-check`, `api/public/version.ts`, `LoginForm.tsx`, notas de versão agrupadas.
- Testes: manter `circuit-manager.test.ts` e `big-events.test.ts`; adicionar teste para a mensagem de arquivo sem partes e para a regra de versão; rodar `bunx tsgo --noEmit` e `bunx vitest run`.
- Limitação: não consigo testar o seletor de arquivos do Android aqui; a confirmação final é no seu celular, conferindo a data em "Sobre".
