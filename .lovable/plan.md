# Substituto (Visita SCS): telefone livre, e-mail JW Hub e aviso aos anciãos

## O que muda

1. **Telefone livre** — o campo "Telefone do Substituto" deixa de forçar o formato do Brasil `(00) 00000-0000`. Aceita qualquer número: `+351 912 345 678`, `+1 (555) 123-4567`, ramais etc. Só são permitidos dígitos, espaço, `+ ( ) - .` (até 30 caracteres).
2. **E-mail do JW Hub (opcional)** — novo campo abaixo do telefone. Se preenchido com algo inválido, aparece um aviso discreto e o botão salvar não deixa passar; vazio é aceito.
3. **Aviso aos anciãos** — o cartão que os anciãos já veem no painel quando a visita é "Visita SCS" ganha uma frase explicando que devem falar com o irmão indicado para obter a programação da visita, e mostra o e-mail (toque abre o e-mail) além do telefone (toque liga).

## Tela do superintendente — Criar/Editar visita

```text
┌───────────────────────────────┐
│ Tipo de visita                │
│ [ Visita SCS             ▾ ]  │
│ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│  Substituto do Superintendente│
│  Nome do Substituto           │
│  [ João da Silva          ]   │
│  Telefone do Substituto       │
│  [ +351 912 345 678       ]   │
│  Qualquer formato de número   │
│  E-mail do JW Hub (opcional)  │
│  [ joao@jwhub.org         ]   │
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│ Início (terça)   Fim (domingo)│
└───────────────────────────────┘
```

## Tela dos anciãos — Painel

```text
┌───────────────────────────────┐
│ ┌───────────────────────────┐ │
│ │ (👤) SUBSTITUTO DO SC      │ │
│ │      João da Silva         │ │
│ │                            │ │
│ │ Para informações sobre a   │ │
│ │ programação da visita,     │ │
│ │ entre em contato com o     │ │
│ │ irmão indicado abaixo.     │ │
│ │                            │ │
│ │ 📞 +351 912 345 678     ›  │ │
│ │ ✉  joao@jwhub.org       ›  │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```
Linhas de contato no estilo iOS/One UI (lista com toque inteiro), cores do tema atual.

Também aparece o e-mail no cartão da visita no Itinerário, no relatório da visita e no relatório completo, ao lado do telefone. Números já salvos no formato brasileiro continuam iguais.

## Detalhes técnicos

- Banco: uma coluna nova opcional `visits.substitute_email text` (ADD COLUMN IF NOT EXISTS). Nenhuma política de acesso muda: as regras atuais da tabela já valem para todas as colunas (super escreve, anciãos da congregação leem).
- `_app.configuracoes.tsx`: remover `maskPhone` do campo do substituto, `inputMode="tel"`, sanitizar com função pura `sanitizeIntlPhone` (novo `src/lib/contact-format.ts`, com `isValidEmail`); form/payload/edição incluem `substitute_email` (zerado quando não for SCS, como hoje).
- `tel:` usa o número só com dígitos e `+`.
- `_app.dashboard.tsx`: cartão existente recebe texto + e-mail (`mailto:`); chaves i18n pt/en/es.
- Relatórios (`_app.relatorio.$visitId.tsx`, `FullVisitReportDialog.tsx`) e cartão do Itinerário mostram o e-mail.
- Cache offline: o e-mail vem na mesma linha da visita, então o espelho local já o carrega.
- Ajuda: atualizar o tópico de Visita SCS.
- Testes: `contact-format.test.ts` (aceita "+351 912 345 678", remove letras, limita 30; e-mail vazio válido, "joao@" inválido). Rodar vitest e tsgo. Versão não muda.
