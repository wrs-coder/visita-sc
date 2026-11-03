# Importar/exportar congregações + Ponto alto no topo do leitor

## (01) Congregações — o que muda
1. O botão **+ Nova** passa a abrir duas opções: **Criar nova** (igual hoje) e **Importar de arquivo**. Aceita os três formatos enviados: lista do JW.org (.csv), Word (.docx) e Excel (.xlsx).
2. Antes de criar qualquer coisa, aparece uma **lista de revisão**. Você marca quem é congregação de verdade.
3. Cada congregação recebe um **código de 5 números**, fácil de digitar. Você pode trocar o código ali mesmo.
4. O número entre parênteses (antes ou depois do nome, ex.: 18911) é o **número da congregação**. A chave "Manter número da congregação" vem ligada e salva o nome como "Cabiri (18911)". Desligada, salva só "Cabiri". Também dá para apagar o número de uma linha só.
5. Novo botão **Exportar** que gera um Word leve com todas as congregações, números e códigos.

```text
┌─────────────────────────────┐
│ ‹  Circuito                 │
│ [Itinerário][Congreg.][Cron]│
├─────────────────────────────┤
│ Congregações (16)           │
│        [⤒ Exportar] [+ Nova]│
│                ┌───────────┐│
│                │✎ Criar nova││
│                │⤓ Importar ││
│                └───────────┘│
│ ...lista atual...           │
└─────────────────────────────┘
```

Revisão da importação (folha que sobe de baixo):
```text
┌─────────────────────────────┐
│ ━━━━                        │
│ Revisar importação          │
│ 16 encontradas · 15 marcadas│
│ Manter nº da congregação [●]│
│ [Marcar todas][Desmarcar]   │
├─────────────────────────────┤
│ ☑ Cabiri            nº 18911│
│   Código  [ 48213 ] ✎       │
│ ☑ Cidade do Sequele 02      │
│   nº 20122  Código [ 70519 ]│
│ ☐ CONGREGAÇÕES:  ← título   │
│ ⚠ Funda 01 — já existe      │
│   (será ignorada)           │
├─────────────────────────────┤
│ [Cancelar]      [Criar 15]  │
└─────────────────────────────┘
```
- Linhas que parecem título ("CONGREGAÇÕES:"), vazias ou repetidas vêm desmarcadas.
- Congregações que você já cadastrou aparecem com aviso e não são duplicadas.
- Um código repetido ou já usado fica em vermelho e bloqueia o botão até você trocar.

Word exportado:
```text
Congregações do Circuito IBE-01-A
Gerado em 03/11/2026

Congregação            Nº      Código
Cabiri                 18911   48213
Cidade do Sequele 02   20122   70519
...
Total: 16 congregações
```

## (02) Leitor da Bíblia — Ponto alto no topo
Celular comum (cerca de 390 px de largura, como o seu):
```text
┌────────────────────────────────┐
│‹ 1 Tes 4 [✎ Ponto alto][Aa🔊][✓ Lido]
│ (tudo em uma linha, sem cortar) │
├────────────────────────────────┤
│ texto do capítulo...           │
```
Conta aproximada: voltar 36 + título 60 + Ponto alto 104 + Aa🔊 52 + Lido 64 + espaços 30 = cerca de 346 px. Isso cabe nos cerca de 365 px úteis.

Celular bem estreito (menos de 360 px):
```text
┌──────────────────────────────┐
│‹ 1 Tes 4 [✎ Ponto alto][Aa][✓]│
├──────────────────────────────┤
```
- Nesse caso, "Aa🔊" vira só "Aa" (o áudio continua dentro da mesma folha) e "Lido" fica só com o ✓. "✎ Ponto alto" sempre aparece escrito por extenso.
- O botão sai de baixo e vai para o topo, com o texto completo **"✎ Ponto alto"**. Ele abre o mesmo formulário de hoje.
- "Concluído" passa a se chamar **"✓ Lido"**. Depois de marcar, mostra "✓ Lido · próximo" só se couber; senão mostra "✓ Lido".
- O título usa sempre a abreviatura quando o nome passa de 8 letras (ex.: "1 Tessalonicenses" vira "1 Tes", "Deuteronômio" vira "Deut"). Se ainda faltar espaço, o título é cortado com "…" e nunca empurra os botões para fora.
- Vou conferir em tela de 360 e de 393 px antes de entregar.
- Os esboços e o pop-up de versículos continuam iguais.

## Pontos de atenção
- Se houver limite de congregações ativas, as que passarem do limite são criadas como inativas e o app avisa.
- O banco de dados não muda. O número fica junto do nome, sem alterar a estrutura (regra do projeto).
- Criar ou editar uma congregação à mão continua igual.

## Detalhes técnicos
- `src/lib/congregation-import.ts`, só no dispositivo. CSV: colunas "Congregação", "Número da congregação" e "Circuito". XLSX e DOCX: leitura com o JSZip que já existe, com os mesmos limites de tamanho do docx-import. Regex `\((\d{3,6})\)` antes ou depois do nome. Heurística de título: termina em ":", tudo maiúsculo ou contém "congregações". Duplicatas detectadas por nome normalizado (sem acento e sem diferença de maiúsculas).
- Código de 5 dígitos via crypto, único entre todos os `invite_code` carregados e o lote; a validação aceita 4–6 caracteres.
- Inserção em lote pelo mesmo caminho do formulário atual. Se o limite de ativas barrar, cria com `is_active=false`.
- Exportação via `docx-export.ts`, com uma tabela simples, e `share.ts` no Android.
- Leitor: em `CleanReader.tsx` o Ponto alto do rodapé (linha ~183) vira um botão de ícone no cabeçalho, de 36px. O título usa a abreviatura do livro quando passa de ~12 caracteres. O botão que aparece ao selecionar um versículo continua.
- Testes vitest para: os três formatos, extração do número, detecção de título, duplicatas, código único e abreviatura.
