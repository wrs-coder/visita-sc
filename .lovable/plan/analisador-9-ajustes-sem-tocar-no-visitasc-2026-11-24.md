# Analisador — 9 ajustes (sem tocar no VisitaSC)

Todas as ideias são possíveis e seguras: mexem só em `public/ferramentas/Analisador/` e nos testes de `ferramentas-testes/`.

## Minha opinião rápida
- (01) datas, (03) não perder ao atualizar, (06) aviso de pioneiro e (07) meses abaixo de 50 h: muito úteis, recomendo.
- (02) "Aplicar mudanças" e (08) "Recalcular dados" fazem quase a mesma coisa. Sugestão: **um único botão "✓ Aplicar mudanças"** no cartão editado, que já recalcula tudo. Mantenho também "⟳ Recalcular dados" no topo, como pedido, para recalcular tudo de uma vez.
- (09) Hoje o Analisador não tem ícone próprio; ao instalar, o celular pode confundir com o VisitaSC. Crio um ícone e nome próprios.

## 1. Datas em qualquer formato (01)
Reconhece `06/05/1986`, `6-5-86`, `1986-05-06`, `06 DE MAIO DE 1986`, `6 de mai. 1986`. Tudo aparece como **dd/mm/aaaa**. Data que não for entendida fica marcada com ⚠ para corrigir à mão.

## 2. Aplicar mudanças + Recalcular (02, 08)
```text
┌──────────────────────────────────┐
│ Analisador        [⟳ Recalcular] │
├──────────────────────────────────┤
│ ▾ João Souza                     │
│  Nascimento [06/05/1986]         │
│  Set  ✓  1  ·  —                 │
│  ● Há mudanças não aplicadas     │
│  [ ✓ Aplicar mudanças ]          │
└──────────────────────────────────┘
```
Resumos, totais e meta só mudam ao tocar em "Aplicar mudanças" ou "Recalcular".

## 3. Atualizar a página não apaga nada (03)
Tudo (grupos, cartões, anotações, período) fica guardado no próprio aparelho e volta ao abrir de novo. Só "Limpar tudo" apaga (com confirmação). Nada vai para a internet.

## 4. Escolher o que entra no PDF (04)
```text
┌──────────────────────────────────┐
│ Relatório PDF                    │
│ [✓] Resumo geral                 │
│ [✓] Resumo por grupo             │
│ [✓] Totais mensais               │
│ [✓] Meta dos pioneiros           │
│ [ ] Listas com nomes             │
│ [✓] Anotações                    │
│        [Cancelar] [⬇ Gerar PDF]  │
└──────────────────────────────────┘
```
PDF com capa (congregação, período, data), títulos claros, tabelas com linhas alternadas e legenda explicando cada termo para os anciãos. O aparelho lembra as escolhas.

## 5. "Ver cartões" no Geral (05)
```text
┌──────────────────────────────────┐
│ Geral · Ver cartões              │
│ ── Grupo 1 (12) ──────────────── │
│ ▸ Ana Lima                       │
│ ▸ João Souza                     │
│ ── Grupo 2 (9) ───────────────── │
│ ▸ ...                            │
│ ── Pioneiros regulares (4) ───── │
│ ▸ ...                            │
└──────────────────────────────────┘
```
Mesmo cartão de sempre (pílulas de ano, Ambos, editar).

## 6. Cartão na pasta Pioneiros sem marcação (06)
Entra em Pioneiros reg. e mostra:
```text
│ ⚠ Marcado como pioneiro? Não     │
│   [Marcar como pioneiro regular] │
```
E no topo de Pioneiros reg.: "3 sem marcação · [Marcar todos]".

## 7. Meses abaixo de 50 h na Meta (07)
```text
│ ▾ Maria Alves   480/600 h  ⚠     │
│   Abaixo de 50 h:                │
│   Out/26  42 h  "doente"         │
│   Jan/27  38 h  —                │
```

## 8. Ícone próprio ao instalar (09)
Nome "Analisador de congregações_SC", ícone diferente e endereço limitado a `/ferramentas/Analisador/`. Funciona como atalho na tela inicial (sem modo offline). Quem já instalou o VisitaSC não é afetado.

## 9. Grupo "Inativos" (novo)
Fica separado, como os Pioneiros, e não conta nos grupos de campo.
Vai para Inativos quem:
- tem a palavra "inativo" em qualquer parte do cartão importado, ou
- está **6 meses seguidos ou mais** sem pregar (até o último mês com relatório).

Quem está **4 ou 5 meses seguidos** sem pregar continua no grupo, com alerta vermelho:
```text
│ Grupo 1  [ Inativos 3 ]          │
│ ⚠ Perigo de ficar inativo (2)    │
│ ▸ Carlos Melo   5 meses sem pregar│
│ ▸ Rita Paz      4 meses sem pregar│
```
Se a pessoa voltar a pregar e for recalculado, ela volta ao grupo de origem sozinha (o grupo original fica guardado). O cartão mostra "Inativo — motivo: palavra no cartão / 6+ meses".

## Detalhes técnicos
- `analyzer.js`: `parseDateAny()` (números, ISO, meses pt por extenso/abreviados, ano de 2 dígitos) usada em PDF/JSON/XML; `belowGoalMonths()`; `needsRpMark()`.
- `app.js`: estado salvo em IndexedDB (`analisador.state`, fallback localStorage) com debounce; edições ficam em rascunho por cartão até "Aplicar"; diálogo de seções do PDF (prefs em localStorage); visão Geral agrupada; ação marcar pioneiro (`status`/`special`).
- `manifest.webmanifest` próprio em `public/ferramentas/Analisador/` com `id`/`scope`/`start_url` nessa pasta + ícones; só `<link rel=manifest>` no index.html. Sem service worker.
- `inactiveInfo(card)`: busca "inativ" em comentários/campos e conta meses seguidos sem participação; grupo virtual "inactive" fora de monthlyTotals dos grupos de campo; `homeGroup` preservado.
- Testes novos em `ferramentas-testes/` (datas, meses <50 h, marcação); guardião de isolamento continua passando. Commit "ferramentas:".
