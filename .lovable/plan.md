# Conversor S-21 → Hourglass (ferramenta separada do VisitaSC)

## Resposta curta
Sim, é possível. O cartão S-21 enviado é um PDF **preenchível** (75 campos): nome, nascimento, batismo, sexo, ancião/servo/pioneiro e os 12 meses (participou, estudos, pioneiro auxiliar, horas, observações). Dá para ler esses campos com precisão, sem "adivinhar" texto. A planilha do Hourglass tem 3 abas: `contacts`, `reports` e `validation` — a ferramenta preenche as duas primeiras e mantém a terceira igual.

## Melhor forma, sem mexer no VisitaSC
Uma **página independente**, fora do aplicativo:

- Endereço próprio: `visitasc.com.br/ferramentas/hourglass/` (link não aparece em nenhum menu do app).
- É um arquivo à parte (HTML + scripts próprios), **não entra na compilação** do app nem no APK da Play Store.
- Não usa login, banco de dados nem nuvem do VisitaSC.
- **Tudo é processado no próprio aparelho** do ancião: os PDFs não são enviados para nenhum servidor (dados pessoais dos publicadores ficam protegidos).
- Acesso exclusivo por **código de acesso** digitado na entrada (guardado só como hash; você troca quando quiser).

## Como fica a tela (celular)
```text
┌─────────────────────────────┐
│  Conversor S-21 → Hourglass │
├─────────────────────────────┤
│ Código de acesso            │
│ [ •••••• ]      [ Entrar ]  │
└─────────────────────────────┘

┌─────────────────────────────┐
│  Conversor S-21 → Hourglass │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │  ⬆  Selecionar cartões  │ │
│ │  S-21 (PDF, vários)     │ │
│ └─────────────────────────┘ │
│                             │
│ 12 cartões lidos · 1 aviso  │
│ ┌─────────────────────────┐ │
│ │ Alidanio A. A. Cadete ✓ │ │
│ │ Masc · Ancião · 12 meses│ │
│ ├─────────────────────────┤ │
│ │ Maria Souza          ⚠  │ │
│ │ Sem data de batismo     │ │
│ └─────────────────────────┘ │
│                             │
│ [ Baixar hourglass-import ] │
└─────────────────────────────┘
```

## Regras de conversão
- Nome completo → `firstname` (primeiro nome), `lastname` (último), `middlename` (o meio).
- Sexo, nascimento, batismo → `sex`, `birth`, `baptism`.
- Ancião → `appt = Elder`; Servo ministerial → `MS`.
- Pioneiro regular → `status = Regular Pioneer`; batizado → `Baptized Publisher`; sem batismo → `Unbaptized Publisher`.
- Cada mês do ano de serviço (ex.: 2025/2026: setembro = 2025-09 … agosto = 2026-08) → uma linha em `reports` com horas, estudos, `pioneer = Auxiliary` se marcado, observações.
- Meses sem nenhum dado não geram linha.
- `ID` numerado 1, 2, 3… ligando `contacts` e `reports`.
- Campos sem correspondência no S-21 (e-mail, telefone, endereço) ficam vazios.
- Cartões escaneados (sem campos) aparecem com aviso "não pôde ser lido".

## Detalhes técnicos
- Página estática em `public/ferramentas/hourglass/` com bibliotecas próprias (pdf-lib para ler os campos, SheetJS para gerar o .xlsx) copiadas para a pasta — nada importado do código do app.
- Gera o `.xlsx` a partir do modelo enviado (abas e validações preservadas).
- `noindex` para não aparecer no Google.
- Teste com o S-21 enviado conferindo os valores extraídos na planilha final.
- Registro no AGENTS.md: ferramenta isolada em `public/`, sem dependência do app.
