# Estudo Pessoal no acesso do Circuito

## Resposta curta
As três opções funcionam e nenhuma mexe no banco de dados. **Recomendo a Opção B** (item próprio no menu lateral): é a que pede menos toques, não mexe nos Esboços (tela grande e sensível) e reaproveita a tela da esposa como ela é.

## Comparação das opções

### Opção A — "Espaço Pessoal" + pílulas dentro de Anotações
```text
+-------------------------------------+
| < Espaço Pessoal                    |
| [Considerações][Esboços][Anotações] |
|  ( Reuniões e eventos )(Estudo)     |  <- 2º nível de pílulas
|  Leitura da Bíblia | Pesquisas      |  <- 3º nível
+-------------------------------------+
```
- Problema: o Estudo fica 3 níveis abaixo (menu > Anotações > Estudo > Bíblia). Muitos toques.
- Mexe na tela de Esboços (a maior do app); risco maior para o que já funciona.

### Opção B — Item novo no menu: "Estudo Pessoal" (recomendada)
```text
Menu lateral                 Tela
+------------------+   +-------------------------------------+
| Painel           |   | Estudo Pessoal                 ⚙️   |
| Circuito         |   | [ Leitura da Bíblia ][ Pesquisas ]  |
| Modelos          |   | ▓▓▓▓░░ 42% · Continuar · Gn 12      |
| Esboços Pessoais |   | ( Anotações de leitura )(Pontos 3)  |
| Estudo Pessoal ← |   |  • Gênesis 1 — ontem                |
| Notas privadas   |   |  • Salmo 23 — há 3 dias       [+]   |
+------------------+   +-------------------------------------+
```
- 1 toque do menu até a leitura. Mesma tela que a esposa já usa (pílulas, 📖 flutuante, ferramentas recolhíveis, backup).
- Esboços Pessoais continuam exatamente como estão.

### Opção C — "Estudo e Esboços" com 3 pílulas no topo
```text
+-------------------------------------+
| Estudo e Esboços                    |
| [ Esboços ][ Anotações ][ Estudo ]  |
|  ( Leitura da Bíblia )( Pesquisas ) |
+-------------------------------------+
```
- Visual bonito, mas obriga a reorganizar a tela de Esboços e mudar links antigos, lembretes e o "deslizar para sincronizar". Mais risco e mais trabalho para pouco ganho sobre a B.

## O que acontece com os dados
- O estudo do superintendente fica **só no aparelho** (como o da esposa), separado por usuário: o da esposa e o dele nunca se misturam, mesmo no mesmo celular.
- Funciona sem internet. Backup e restauração pelo ⚙️ (mesmo arquivo .zip que a esposa usa).
- Não vai para a nuvem nesta etapa (pode ser uma melhoria futura).

## Melhorias sugeridas (opcionais, depois)
1. Atalho "Continuar leitura · Gn 12" no card do Painel.
2. Lembrete diário de leitura (aproveitando os lembretes locais que já existem).
3. Sincronização opcional do estudo com a nuvem, mais adiante.

## Detalhes técnicos
- `GuestWorkspace` hoje lê a chave de armazenamento de `readGuestSession()` (hash do código de convite). Adicionar prop opcional `storageKey?: string`; sem a prop, comportamento da esposa idêntico.
- Para o superintendente: chave `guest.workspace.user.<userId>.data` (prefixo `WS_PREFIX` existente, IndexedDB com fallback localStorage), isolada por `userId`.
- Chaves de preferências de tela (aba de estudo, toolbar, posição do 📖) recebem sufixo por contexto para não colidir.
- Nova rota `src/routes/_app.estudo-pessoal.tsx` (head próprio), renderizando `<GuestWorkspace section="study" storageKey=... />`, restrita a superintendente (mesmo padrão de redirecionamento das outras telas super-only).
- Item no menu em `_app.tsx` (logo abaixo de "Esboços Pessoais") e em `CommandPalette.tsx` com `superOnly: true`; i18n pt/en/es `sidebar.personalStudy`.
- Teste: `wsSessionKey`/chave por usuário não colide com a chave da esposa.
- Registrar regra no `AGENTS.md`. Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
