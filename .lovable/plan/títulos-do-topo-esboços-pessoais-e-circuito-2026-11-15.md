# Títulos do topo: Esboços Pessoais e Circuito

## Resposta direta
O "mapeamento" é só uma lista que diz **qual nome mostrar no topo** de cada tela. Ele não muda endereços, links, dados, sincronização nem lembretes. Ou seja: é exatamente "usar 'Esboços Pessoais' visualmente", reaproveitando o mesmo texto já usado no menu lateral. Nada além do título muda.

## Prévia

```text
┌─────────────────────────────┐
│ [☰]  Esboços Pessoais       │  <- antes: nome da congregação
├─────────────────────────────┤
│  (conteúdo igual ao atual)  │
└─────────────────────────────┘

┌─────────────────────────────┐
│ [☰]  Circuito               │  <- antes: Congregações
├─────────────────────────────┤
│ [Itinerário][Circuito] 📅   │
│  (conteúdo igual ao atual)  │
└─────────────────────────────┘
```

## O que muda
- Tela Esboços Pessoais: topo mostra "Esboços Pessoais" (mesmo texto do menu lateral, em pt/en/es).
- Tela Congregações: topo mostra "Circuito" (mesmo texto da pílula).

## O que NÃO muda
Endereço das telas, links antigos, notas, pastas, sincronização, pílulas e menu.

## Detalhes técnicos
- `src/lib/page-titles.ts`: adicionar `"/consideracoes-campo"` apontando para a chave já usada no menu lateral; trocar `"/congregacoes"` para `circuit.pillCircuit`.
- Teste existente de títulos valida que as chaves existem em pt/en/es.
