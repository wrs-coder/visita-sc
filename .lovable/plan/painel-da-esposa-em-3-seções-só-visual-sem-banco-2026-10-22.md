# Painel da esposa em 3 seções (só visual, sem banco)

## Como vai ficar
Topo fixo e discreto com 3 botões segmentados (funciona bem no celular e no computador, sem menu lateral ocupando espaço):

```text
[ Semana da Visita | Anotações | Estudo Pessoal ]        (pasta/engrenagem)
```

1. **Semana da Visita** — tudo o que existe hoje continua igual: Hoje, Programação, Estudos, Campo, Refeições, Transporte e as abas extras (Casal, Reuniões, Pastoreios, Checklist) quando já aparecem.
2. **Anotações** — lista limpa de notas de exemplo (vazia com mensagem amigável) e botão "Nova anotação".
3. **Estudo Pessoal** — duas sub-abas: "Leitura da Bíblia" e "Pesquisas Pessoais", cada uma com lista e botão "Nova".

## Modo Foco (Zen)
- Ao abrir uma anotação ou pesquisa: somem as 3 abas, as listas e o cabeçalho; fica só um título, área de escrita ampla, centralizada, e um botão discreto "Voltar".
- Fundo e tipografia calmos, usando as cores do tema (claro, escuro e preto puro).

## Gaveta lateral
- Ícone discreto (pasta/engrenagem) no topo de Anotações e Estudo Pessoal abre uma gaveta lateral com: Pastas, Cores (etiquetas) e Configurações (tamanho da letra, largura do texto).
- Nesta fase as opções só mudam a tela; nada é gravado no servidor.

## O que NÃO muda
- Nenhuma alteração no banco de dados ou regras de acesso.
- Conteúdo da "Semana da Visita" fica idêntico.
- O texto escrito fica só na memória da tela por enquanto (será salvo numa próxima fase). A seção escolhida é lembrada no aparelho.

## Detalhes técnicos
- Novo `src/components/guest-workspace/`: `GuestSectionNav.tsx` (segmented control, `role=tablist`), `NotesSection.tsx`, `PersonalStudySection.tsx` (Tabs internas `bible`/`research`), `FocusEditor.tsx` (textarea/rich simples, full-screen `fixed inset-0 bg-background`), `WorkspaceSheet.tsx` (shadcn `Sheet` side="right").
- Estado: `section: "week" | "notes" | "study"` e `studyTab` em localStorage (`guest.workspace.section`); `openItem` em estado local — quando definido, renderiza só `FocusEditor` e oculta o header/nav do painel.
- `visitante.painel.tsx`: envolver o bloco `<Tabs>` existente (linhas ~465-675) dentro da seção "week" sem alterar seu conteúdo; montagem das outras seções sob demanda.
- Textos novos com `t()` + `defaultValue` em pt; chaves adicionadas em pt/en/es.
- Só tokens de `styles.css`, sem cores fixas. Validar com `tsgo` e `vitest`.

## Backup e Dados (na gaveta lateral)
Nova seção "Backup e Dados" dentro da gaveta, com:
- **Gerar backup**: cria um arquivo .zip no aparelho com Anotações, Pastas, Pesquisas e Histórico de Leitura da Bíblia da esposa.
- **Restaurar backup**: escolhe um .zip do aparelho, mostra o que será restaurado e pede confirmação antes de substituir.
- **Importar Plano/Bíblia**: escolhe arquivo local (EPUB da TNM, pelo leitor privado já existente, ou plano de leitura em .json).
- **Exportar item**: dentro de cada anotação ou pesquisa aberta, botão discreto para salvar como .txt, .md ou PDF.
- Tudo funciona sem internet: arquivos são lidos e gerados no próprio aparelho, sem passar pelo servidor. No Android usa a gravação em partes já existente.

### Detalhes técnicos (backup)
- Reutilizar `backup-package.ts` (`packBackupZip`/`unpackBackupZip`, formato v3, zip seguro) e `backup-client.ts` (`dumpClientBackup`/`restoreClientBackup`) filtrando apenas os stores/chaves do espaço da esposa (prefixo `guest.workspace.*` + notas/pastas/histórico locais). `server.json` vai vazio para não depender de `backup.functions.ts` (que exige rede e sessão de superintendente).
- Importar Bíblia: chamar o fluxo existente de `epub-bible-parser.ts` / `BibleManagerDialog`; nenhuma Bíblia embutida.
- Exportar PDF via `src/lib/pdf/pdf-engine.ts` (pdf-lib); .txt/.md via Blob local; no nativo, Filesystem em partes.
- Restaurar valida manifest, tamanho e tipo antes de gravar; nunca toca no banco.
