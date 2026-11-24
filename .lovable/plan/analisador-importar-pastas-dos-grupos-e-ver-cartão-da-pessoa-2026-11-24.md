# Analisador — importar pastas dos grupos e ver cartão da pessoa

Só arquivos em `public/ferramentas/Analisador/` (e o teste do analisador). Nada do app VisitaSC muda.

## 1. Importar pastas completas
Você escolhe a pasta da congregação (com uma subpasta por grupo) ou várias pastas de grupos. O nome de cada pasta vira um grupo, e os cartões ficam no grupo da pasta onde estavam.

```text
Congregação Central/
├── Grupo 1 - João/   → pílula "Grupo 1 - João"
├── Grupo 2/          → pílula "Grupo 2"
└── Pioneiros/        → pílula "Pioneiros reg."
```

Tela:
```text
┌──────────────────────────────┐
│ [Geral][Grupo 1][+ Grupo]    │
│                              │
│ ┌──────────────────────────┐ │
│ │ 📁 Importar pastas dos   │ │
│ │    grupos                │ │
│ │ Uma pasta por grupo. O   │ │
│ │ nome da pasta vira o     │ │
│ │ nome do grupo.           │ │
│ └──────────────────────────┘ │
│                              │
│ Conferir antes de importar:  │
│  Grupo 1 - João   12 PDFs  ✓ │
│  Grupo 2          10 PDFs  ✓ │
│  Pioneiros         4 PDFs  → │
│        Pioneiros reg.        │
│ [Cancelar]      [Importar]   │
└──────────────────────────────┘
```
- Regras:
  - Uma pasta cujo nome tenha "pioneiro" vai para **Pioneiros reg.**
  - Uma pasta com o mesmo nome de um grupo que já existe junta os cartões nesse grupo, sem duplicar.
  - PDFs soltos, fora de subpastas, vão para o grupo aberto.
  - Arquivos que não são PDF são ignorados.
- No computador também dá para **arrastar as pastas** para a página.
- Um cartão que já existe (mesma pessoa e mesmo ano) é atualizado, igual à reimportação de hoje.
- Ao final aparece um aviso, por exemplo: "3 grupos criados, 26 cartões novos, 2 atualizados, 1 não lido".
- **Limitação:** alguns celulares Android não deixam escolher uma pasta inteira. Nesses aparelhos o botão "⬆ Importar S-21" em cada grupo continua funcionando. Vou avisar isso na própria tela quando o aparelho não aceitar pastas.

## 2. Tocar no nome e ver o cartão mês a mês
Nas listas (Irregulares, P.A., Dirigem estudos etc.), tocar no nome abre o cartão da pessoa, só para leitura:

```text
┌──────────────────────────────┐
│ ‹ Voltar   Ana Souza         │
│ Grupo 2 · Publicadora batiz. │
│ Batismo 12/03/2015           │
│ (Ano 2026) [Ano 2027]        │
├──────────────────────────────┤
│ Mês  Part. Est. P.A. Horas   │
│ Set   ✓    1     ·    ·      │
│ Out   ✓    1     ✓   30      │
│ Nov   ✗    ·     ·    ·   ⚠  │
│ ...                          │
│ Obs.: novo publicador (Set)  │
├──────────────────────────────┤
│ [Editar este cartão]         │
└──────────────────────────────┘
```
- Os meses do período analisado ficam destacados. Os meses sem pregar aparecem com ⚠.
- Se a pessoa tiver cartões de dois anos, há uma pílula por ano.
- **‹ Voltar** volta para a lista. **Editar este cartão** abre o grupo dela com o cartão expandido.

## Detalhes técnicos
- `index.html`:
  - novo `<input type="file" webkitdirectory multiple>`;
  - botão "Importar pastas dos grupos" acima das pílulas;
  - zona de arrastar (`dataTransfer.items` + `webkitGetAsEntry` para ler as subpastas).
- `app.js`:
  - `groupFromPath(webkitRelativePath)` usa o nome da pasta-mãe do PDF;
  - folha de conferência no `<dialog>` existente;
  - `addFiles` reaproveitado por grupo;
  - o grupo é comparado pelo nome, sem diferenciar maiúsculas e acentos;
  - nas listas, os itens ganham `data-person` e abrem a visão do cartão no mesmo `<dialog>`, com Voltar.
- `analyzer.js`: função pura `folderGroups(paths)` → `{ nome: [arquivos] }`, com a regra de "pioneiro" e a regra dos PDFs soltos.
- Testes:
  - caminhos "Cong/Grupo 1/a.pdf" → "Grupo 1";
  - "Cong/Pioneiros/b.pdf" → Pioneiros reg.;
  - PDF solto → grupo aberto;
  - nome repetido com acento ou maiúscula diferente → mesmo grupo.
- Conferir com Playwright em 393×687 que nenhum botão sai da tela e que o cartão abre a partir da lista.
