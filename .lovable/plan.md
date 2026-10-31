# Grandes Eventos — link curto, PDF individual e modelo de carta

Observação: o modelo de carta citado não chegou anexado nesta mensagem. O plano abaixo usa um timbre padrão editável; ao receber o modelo, ajusto o desenho da carta a ele antes de executar.

## 1. Link curto `visitasc.com.br/c/k7m9p2`

- Novo endereço público `/c/<código>`. O antigo `/confirmar/<código>` continua funcionando (links já enviados não quebram).
- Código de 8 caracteres, letras minúsculas e números sem os confusos (0/o, 1/l): ~1 trilhão de combinações, gerado com sorteio seguro do aparelho.
- Vale para novos eventos e para links pessoais novos/regerados. Eventos antigos mantêm o link longo até você tocar em "Gerar novo link".
- "Copiar convite", Word e PDF usam sempre `https://visitasc.com.br/c/...`, mesmo no APK ou no preview.
- Proteções atuais (PIN, bloqueio por tentativas, link pessoal só da própria parte) seguem iguais.

## 2. Exportar convites: Word ou PDF

Botão "Exportar" abre escolha:

```text
+--------------------------------+
| Exportar convites              |
|                                |
|  [W]  Word (um arquivo)        |
|       todos os convites juntos |
|                                |
|  [P]  PDF individuais (.zip)   |
|       uma carta por orador     |
|                                |
|        [ Cancelar ]            |
+--------------------------------+
```

- Word: como hoje, mas já no formato carta (item 3).
- PDF: um arquivo por parte, entregues num .zip. Nome do arquivo:
  - Discurso: `07 - Joao Silva - Central.pdf` (número do esboço)
  - Oração/Presidência: `Oracao - Joao Silva - Central.pdf`
- Na carta em PDF, "clique aqui" é um link ativo ao toque, abrindo `/c/<código>`.

## 3. Modelos de carta convite (nova pílula)

Recomendação: pílula "Modelos" dentro de Grandes Eventos. Você cria 1 ou mais modelos e cada evento escolhe qual usar (com um modelo padrão).

```text
+--------------------------------+
| < Circuito                     |
| (Eventos) (Modelos)            |
|--------------------------------|
| Modelos de carta         [ + ] |
|  ┌──────────────────────────┐  |
|  │ Assembleia de circuito ★ │  |
|  │ Padrão · editado 30/10   │  |
|  └──────────────────────────┘  |
|  ┌──────────────────────────┐  |
|  │ Congresso regional       │  |
|  └──────────────────────────┘  |
+--------------------------------+
```

Editor do modelo:

```text
+--------------------------------+
| < Modelo          [Prévia][OK] |
|--------------------------------|
| Timbre                         |
|  Nome: Wanderson P. R. Santos  |
|  Cargo: Superintendente Circ.  |
|  Circuito / Contato / Cidade   |
|--------------------------------|
| Texto da carta (editor)        |
| Prezado irmão {orador},        |
| Você foi designado para        |
| {parte} - "{tema}" no dia      |
| {data} às {hora}, em {local}.  |
| Para confirmar, {clique aqui}. |
|--------------------------------|
| Campos: {orador} {congregacao} |
| {parte} {tema} {esboco} {data} |
| {hora} {duracao} {local} {pin} |
|--------------------------------|
| Assinatura: [nome]  Fechamento |
+--------------------------------+
```

Carta gerada (Word/PDF, A4):

```text
+--------------------------------+
| WANDERSON P. R. SANTOS         |
| Superintendente de Circuito    |
| Circuito XX · tel · e-mail     |
|________________________________|
|                     30/10/2026 |
| Ao irmão João Silva            |
| Congregação Central            |
|                                |
| Designação: Discurso nº 7      |
| Tema: "Confie em Jeová"        |
| Dia 14/03, 09:40 · 15 min      |
|                                |
| Para confirmar, clique aqui.   |
|                                |
| Seu irmão,                     |
| Wanderson                      |
+--------------------------------+
```

- No evento, campo "Modelo de carta" (padrão pré-selecionado). Sem modelo, usa o texto atual.
- Copiar convite (WhatsApp) continua em texto curto, com o link.

## Detalhes técnicos

- `src/lib/big-events/short-code.ts`: `newShortCode(8)` com `crypto.getRandomValues` e alfabeto de 31 chars; testes de tamanho/alfabeto.
- `invite.ts`: `inviteLink()` passa a usar constante `OFFICIAL_ORIGIN = "https://visitasc.com.br"` e caminho `/c/`; o `origin()` local em BigEvents.tsx deixa de ser usado para convites.
- `BigEvents.tsx`: troca `crypto.randomUUID()` por `newShortCode()` em personal_token e no public_token de eventos novos (colunas já são texto; sem mudança no banco). Busca por token no servidor não muda.
- Nova rota `src/routes/c.$code.tsx` reaproveitando o componente da página de confirmação (extraído de `confirmar.$token.tsx`), com head noindex.
- PDF via pdf-lib (`src/lib/pdf/pdf-engine.ts`), com anotação de link no "clique aqui"; zip com JSZip existente; salvar via `share.ts` em blocos.
- Modelos: sem alterar banco (regra permanente). Guardados no aparelho por usuário (`bigEvents.letterTemplates.<userId>`) e incluídos no backup existente; escolha do modelo por evento também no aparelho. Se preferir que sincronize entre aparelhos, isso exigiria tabela nova — só com sua autorização.
- Placeholders substituídos por função pura `renderLetter(template, part, event)` com testes; Word reaproveita `htmlToDocx`.
- Sem subir versão agora (lote de testes), conforme combinado.
