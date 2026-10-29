# Estudo e Anotações no acesso do Circuito

## Resposta curta
Sua ideia é melhor que a Opção B pura. A tela "Esboços" fica mais leve (só Considerações e Esboços), e tudo que é pessoal fica junto em "Estudo e Anotações". Nada muda no banco de dados e nenhuma anotação existente é perdida.

## Como fica
```text
Menu lateral              Tela "Estudo e Anotações"
+------------------+   +-------------------------------------+
| Início           |   | Estudo e Anotações             ⚙️   |
| Circuito         |   | [ Bíblia ][ Pesquisas ][ Anotações ]|
| Esboços          |   | ▓▓▓▓░░ 42% · Continuar · Gn 12      |
| Estudo e Anot. ← |   | ( Anotações de leitura )(Pontos 3)  |
| Notas privadas   |   |  • Gênesis 1 — ontem                |
+------------------+   |  • Salmo 23 — há 3 dias       [+]   |
                       +-------------------------------------+

Tela "Esboços" (mais leve)
+-------------------------------------+
| Esboços                             |
| [ Considerações ][ Esboços ]        |  <- "Anotações" sai daqui
+-------------------------------------+
```

## Minhas sugestões sobre o ajuste
1. **Nome curto nas pílulas:** "Bíblia", "Pesquisas", "Anotações" cabem numa linha no celular; "Leitura da Bíblia" quebraria a linha.
2. **Anotações continuam as mesmas:** a pílula "Anotações" abre exatamente as anotações de reuniões e eventos de hoje (mesmos textos, pastas, exportação Word, 📖 flutuante). Só muda o lugar onde ficam.
3. **Links antigos funcionam:** quem tocar num atalho ou lembrete antigo de Anotações cai direto na pílula "Anotações" da nova tela.
4. **Menu "Esboços":** renomear "Esboços Pessoais" para só "Esboços" fica mais limpo (como você desenhou).
5. **Lembrar a última pílula:** a tela abre na última pílula usada.

## O que acontece com os dados
- Anotações: ficam onde já estão no aparelho; nada é copiado nem apagado.
- Estudo (Bíblia e Pesquisas) do superintendente: só no aparelho, separado por usuário — o da esposa e o dele nunca se misturam. Funciona sem internet; backup pelo ⚙️.

## Detalhes técnicos
- `GuestWorkspace`: nova prop opcional `storageKey`; sem ela, comportamento da esposa idêntico. Superintendente usa `guest.workspace.user.<userId>.data`. Preferências de tela com sufixo por contexto.
- Nova rota `src/routes/_app.estudo-pessoal.tsx` (super-only, head próprio) com pílulas `bible | research | notes`, persistidas em localStorage.
- Pílula "Anotações": extrair a visão `talk_notes` de `_app.consideracoes-campo.tsx` para reutilização (mesmo store `bible-notes-store`, mesmo editor), sem mudar formato de dados.
- `consideracoes-campo.tsx`: remover a aba `talk_notes`; `?type=talk_notes` ou notas desse tipo redirecionam para `/estudo-pessoal?tab=notes&noteId=...`.
- Menu `_app.tsx` e `CommandPalette.tsx`: "Esboços" + "Estudo e Anotações"; i18n pt/en/es.
- Testes: chave por usuário não colide com a da esposa; redirecionamento de `talk_notes`. `AGENTS.md` atualizado. Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
