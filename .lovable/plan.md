# Plano: botão "Esboços" na edição + importar oradores em Grandes Eventos

## 1. Botão "⬅ Esboços" no modo edição

Hoje, ao editar um esboço, o botão do topo diz "⬅ Mostrar esboços" e só abre a pasta atual. Passará a ser igual ao Modo esboço: "⬅ Esboços", voltando para a lista completa (todas as pastas).

```text
ANTES                              DEPOIS
┌───────────────────────────┐      ┌───────────────────────────┐
│ ⬅ Mostrar esboços  📖Modo │      │ ⬅ Esboços   📖 Modo esboço│
│ ✎ Detalhes  ⤢  ⋯   💾     │      │ ✎ Detalhes  ⤢  ⋯   💾     │
├───────────────────────────┤      ├───────────────────────────┤
│ texto do esboço...        │      │ texto do esboço...        │
```

- O texto em edição continua guardado (rascunho automático), nada é perdido ao voltar.
- No computador, o botão "Mostrar/Expandir" da lateral continua como está.

## 2. Importar oradores no Programa do evento

É seguro e viável. Tudo é lido só no aparelho, como já fazemos com congregações e Word. Nada é enviado antes da sua confirmação.

Botão novo "Importar oradores" no topo do Programa do evento. Aceita .csv, .xlsx, .docx e .pdf (PDF apenas com texto; PDF escaneado/foto não é lido).

O app procura em cada linha: Nº do esboço + nome do orador + congregação, e liga ao discurso do programa com o mesmo Nº.

```text
┌───────────────────────────┐
│ Importar oradores      ✕  │
│ arquivo: programa.xlsx    │
├───────────────────────────┤
│ ☑ Nº 12 · A fé que move   │
│   João Silva · Cabiri     │
│ ☑ Nº 34 · Seja vigilante  │
│   Pedro Lima · Cazenga    │
│   ⚠ substitui: Carlos M.  │
│ ☐ Nº 99 · (não está no    │
│   programa)               │
├───────────────────────────┤
│  Cancelar     Aplicar (2) │
└───────────────────────────┘
```

Regras de segurança:
- Você revisa tudo antes; linhas sem Nº correspondente vêm desmarcadas.
- Se a parte já tem outro orador, aparece aviso "substitui" e vem desmarcada.
- Partes com orador já confirmado nunca são trocadas automaticamente.
- Trocar o orador usa o mesmo caminho de hoje: gera novo link/PIN como já acontece manualmente.
- Partes do SC e Rep. Filial são ignoradas.
- Limites de tamanho de arquivo e proteção contra arquivos maliciosos (os mesmos da importação de congregações).

## Detalhes técnicos
- `OutlinesWorkspace.tsx`: no topo, em `focusEdit`, usar o rótulo `personalOutlines.list.back` e o mesmo `onBack` do modo esboço (sair da pasta para a raiz).
- Novo `src/lib/big-events/speaker-import.ts`: reaproveita leitura de csv/xlsx/docx de `congregation-import.ts` (JSZip, limites, rejeição DOCTYPE/ENTITY); PDF via `pdfjs-dist` carregado sob demanda (nova dependência, só no clique). Extrai linhas → `{number, speaker, congregation}` por colunas (planilha) ou padrão "Nº – Nome – Congregação" (texto).
- Casamento por `outline_number` normalizado; aplicar via função existente de atualização de parte (que já renova token/PIN).
- Sem mudança de banco. Testes unitários para o leitor e o casamento; typecheck e vitest.
