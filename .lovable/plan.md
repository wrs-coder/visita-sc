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

## Novo: importar o CSV de designações do Circuito Manager

Arquivo analisado: "Designações do Programa da Assembleia.csv" (separador `;`, colunas Número, Designação, Início, Turno, Duração, Designado, Participação...).

- O botão Importar de Grandes Eventos passa a aceitar também `.csv`.
- Mesmas regras do .json do Circuito Manager: Manhã, Tarde e Música viram títulos (não são partes); "Cântico e oração" entra sem orador; "Série de discursos: X" + linhas com "•" viram Simpósio; Batismo, Discurso Público e A Sentinela são reconhecidos pelo tema.
- Horário "10:16:50.1" vira 10:16; duração em minutos.
- **Vantagem do CSV:** a coluna "Designado" já preenche o nome do orador (ex.: parte 1 → Alberto Luvumba Silva). "Notificado/Aceito" não são importados; as confirmações continuam pelo app.
- Arquivo lido só no aparelho, com limite de tamanho; acentos e aspas curvas preservados.

## Novo: botões escondidos atrás da barra do celular (S22 Ultra)

Causa confirmada no código: a tela de leitura do capítulo ocupa a tela inteira, e a linha "+ Ponto alto / Concluído" não reserva espaço para a barra de navegação do Android. No Android 15 (One UI 7), o app desenha até a borda da tela, então os botões ficam por baixo da barra.

- Leitura do capítulo (esposa e superintendente): a linha de botões e a barra de ferramentas do versículo ganham um espaço de segurança embaixo.
- Revisar as outras telas cheias com botões no rodapé (diálogos de tela cheia, tela cheia do esboço) e aplicar o mesmo espaço.
- O espaço é calculado pelo próprio Android (funciona com gestos ou com 3 botões); em celulares sem barra, nada muda.

```text
Antes                         Depois
│ ...texto do capítulo...  │  │ ...texto do capítulo...  │
│[+ Ponto alto][Concluído] │  │[+ Ponto alto][Concluído] │
│▒▒▒ ◁   ○   ▢ ▒▒▒▒▒▒▒▒▒▒▒ │  │                          │
  (botões cobertos)           │▒▒▒ ◁   ○   ▢ ▒▒▒▒▒▒▒▒▒▒▒ │
```

## Detalhes técnicos
- Classe `pb-safe-nav` = `max(env(safe-area-inset-bottom), var(--safe-area-inset-bottom, 0px))` (o Capacitor 8 injeta a variável), aplicada em `CleanReader.tsx` (rodapé e barra do versículo) e nos demais `fixed inset-0` com rodapé.
- `parseCircuitManagerCsv` em `etim-import.ts`, reaproveitando as regras do .json, preenchendo `speaker_name` com "Designado"; teste com o seu CSV.
- `BigEvents.tsx`: `accept` passa a omitir o filtro restritivo (ou `*/*`), mantendo a validação por extensão + `parseProgramFile`; erro inclui `f.name`.
- `etim-import.ts`: textos de erro genéricos; lógica de detecção inalterada.
- Versão 5.0.6 em `package.json`, `android/app/build.gradle` (versionCode 35), `app-update-check`, `api/public/version.ts`, `LoginForm.tsx`, notas de versão agrupadas.
- Testes: manter `circuit-manager.test.ts` e `big-events.test.ts`; adicionar teste para a mensagem de arquivo sem partes e para a regra de versão; rodar `bunx tsgo --noEmit` e `bunx vitest run`.
- Limitação: não consigo testar o seletor de arquivos do Android aqui; a confirmação final é no seu celular, conferindo a data em "Sobre".
