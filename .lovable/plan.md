## Plano

### 1) Exportar/Importar JSON na aba "Modelo Programação Anciãos"

Reaproveitar o mesmo padrão de `TemplateIOButtons` + `template-io.functions.ts` já usado em Checklist, Reuniões de Campo e Programação. A escolha de pasta já é nativa: `src/lib/share.ts` usa `showSaveFilePicker` quando o navegador suporta (Chrome/Edge/Opera desktop e Android) e cai para download/`Web Share` quando não — comportamento idêntico aos outros modelos, sem trabalho adicional.

**Backend** — em `src/lib/template-io.functions.ts`:
- `exportElderProgramTemplate({ id })` — server fn protegida; lê `elder_program_templates` (verifica `superintendent_id = userId`), `elder_program_template_sections`, `elder_program_template_slots`, `elder_program_template_events`. Devolve `{ ok, file: { type: "elder_program_template", version: 1, exportedAt, name, sections: [{section, additional_info}], slots: [{label, sort_order}], events: [...todos os campos…] } }`.
- `importElderProgramTemplate({ file })` — valida com `elderFileSchema` (zod com enums `pastoral|encouragement|recommendations|local`, `category`, `purpose`); cria novo `elder_program_templates` com `congregation_id: null`, depois insere sections/slots/events em lote. Aplica `assertUnderLimit` (limite ≤ MAX=50, igual ao usado na página).

**Frontend** — em `src/routes/_app.modelo-programacao-ancioes.tsx`:
- Importar `TemplateIOButtons` e as duas novas server fns.
- Renderizar `<TemplateIOButtons filenameBase={tpl?.name ?? "programacao-ancioes"} onExport={...} onImport={...} disabled={!tpl}/>` na barra de ações do modelo selecionado (ao lado de Duplicar/Salvar), espelhando `_app.modelo-reunioes-de-campo.tsx`.
- Após importar com sucesso, recarregar lista de templates e selecionar o novo id.

Sem migração de banco. Sem mudanças de RLS (server fn usa `supabaseAdmin` com checagem de propriedade).

### 2) "Relatório executivo" em PDF na aba "Pastoreios, Recomendações e outros"

Botão novo no topo de `src/routes/_app.programa-ancioes.tsx` que abre um **Dialog de seleção de seções** e, ao confirmar, gera um PDF com layout de relatório executivo. Pasta de destino: usa `saveBlob` de `src/lib/share.ts`, que já chama `showSaveFilePicker` — o usuário escolhe a pasta nativamente.

**UI** — novo componente `src/components/elder-program/ElderExecutiveReportDialog.tsx`:
- Checkboxes:
  - Cabeçalho da visita (título + semana) — sempre incluído
  - Informações adicionais do superintendente (por seção)
  - Visitas de Pastoreio
  - Encorajamento (Inativos, Doentes, Privilégios Especiais)
  - Recomendações
  - Assuntos locais
- Botão "Gerar PDF". Sem renderização HTML intermediária: usa **jsPDF puro** (texto + auto-quebra), evitando o `html-to-image` do `VisitSummaryView` (que captura DOM e fica pesado para listas longas). Padrão A4, margens 12mm, fonte Helvetica, títulos de seção em destaque com filete inferior, eventos como blocos com labels (Dia/Horário, Acompanhante, Família, Endereço, etc.). Lida com quebra de página via `pdf.splitTextToSize` + controle de `cursorY`.
- Nome do arquivo: `relatorio-executivo-ancioes-{slug(visit.title)}-{YYYY-MM-DD}.pdf`.
- Chama `saveBlob(blob, { filename, mimeType: "application/pdf", pickerTypes: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }] })` — abre o seletor de pasta quando suportado.
- Toasts de sucesso/falha (reaproveita chaves i18n `guest.export.pdf` / `pdfFail`).

**Integração** — em `src/routes/_app.programa-ancioes.tsx`:
- Estado `reportOpen`. Botão `<Button variant="outline" onClick={() => setReportOpen(true)}><FileDown/> Relatório executivo</Button>` no header da página, abaixo do subtítulo.
- Passa para o dialog: `visit`, `sections`, `pastoral`, `encouragement`, `recommendations`, `local` (já carregados pela página).
- Disponível para ambos: superintendente e anciãos (somente leitura nada impede gerar relatório).

**i18n** — adicionar chaves em `pt/en/es`:
- `elderProgram.report.button`, `report.title`, `report.selectSections`, `report.sectionPastoral|encouragement|recommendations|local|info|header`, `report.generate`.

### Arquivos afetados

- `src/lib/template-io.functions.ts` — novo `exportElderProgramTemplate` + `importElderProgramTemplate` + schema.
- `src/routes/_app.modelo-programacao-ancioes.tsx` — botões IO no header do modelo.
- `src/components/elder-program/ElderExecutiveReportDialog.tsx` — novo dialog + gerador PDF.
- `src/routes/_app.programa-ancioes.tsx` — botão "Relatório executivo" + dialog.
- `src/i18n/locales/{pt,en,es}.json` — novas chaves.

Sem mudanças de banco, sem novas dependências (`jspdf` já está no projeto).
