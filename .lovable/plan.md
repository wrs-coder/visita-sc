# Grandes Eventos — link curto, PDF individual e modelo de carta

A carta segue o modelo enviado (Nº 13 Gonçalves Da Justino): timbre, destinatário, Ref., abertura, quadro da designação preenchido automaticamente pelo evento, lembretes e assinatura.

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
+----------------------------------------+
|        WANDERSON RODRIGUES             |  timbre (modelo)
|              IBE-01                    |
|  Rua 1, Bl 03 ... Angola · Tel ...     |
|----------------------------------------|
|                 31 de outubro de 2026  |  data automática
| Gonçalves Da Justino                   |  orador (auto)
| C.Funda 01                             |  congregação (auto)
| Ref:. DESIGNAÇÃO — Escola ... 2027     |  modelo
| Amado irmão:                           |
|  Por ser um exemplo... (texto livre)   |  modelo
|  ┌──────────────────────────────────┐  |
|  │ Assembleia ... — sáb 07/11/2026  │  |  TUDO AUTOMÁTICO
|  │ Local: SAV                       │  |  vindo do evento
|  │ Orador: nome — congregação       │  |
|  │ Sua designação: Discurso nº 7    │  |
|  │   · 09:40 · 15 min               │  |
|  │ Tema: ...                        │  |
|  │ Próximo orador: ... (se ativo)   │  |
|  │ Aceitar/recusar: [Clique aqui!]  │  |  link ativo no PDF
|  │ PIN: 079382 (só no modo PIN)     │  |
|  └──────────────────────────────────┘  |
|        INFORMAÇÕES & LEMBRETES:        |  blocos do modelo
|  [faixa cinza] O esboço e os vídeos... |
|  [faixa verde] Preparação/Participação |
|  • Data e Local do Ensaio: ...         |
|  Torne sua participação ... oração     |
|                     Seu irmão,         |
|           Wanderson Rodrigues, SC      |  assinatura cursiva
+----------------------------------------+
```

- O superintendente edita timbre, Ref., abertura, lembretes, ensaio e assinatura. O quadro da designação não é editável: vem do evento e da parte.
- Linhas vazias somem (sem local, sem próximo orador, sem PIN no modo link pessoal).
- Já deixo um modelo inicial com o texto da sua carta, para você só revisar.

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
