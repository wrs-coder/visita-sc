# Ajuda completa (Esboços, Painel, Modelos de visita) e primeira entrada em Meu Perfil

## (01) Ajuda: três temas mais completos

Hoje o tema "Esboços e Bíblia" tem só 7 passos e mistura duas coisas. Ele será dividido, e entram dois temas novos.

Novos temas (ordem final na Ajuda):
1. Entrada e segurança
2. **Painel inicial** (novo) — as 4 telas que se passam com o dedo: Agenda (pílulas), Esboços, Visita, Pastoreio; o ícone de recados no topo; como trocar de tela e o que cada cartão mostra.
3. Circuito e visitas
4. **Modelos de visita** (novo) — tela "Modelos" (até N modelos numerados), criar, renomear, duplicar, exportar; seções Estudos / Refeições / Transporte; pacotes de visita; aviso diário de "visita sem modelos"; demais modelos (reuniões de campo, discursos, programação dos anciãos, checklist).
5. Semana da visita
6. **Esboços** (expandido) — lista, pastas, criar/editar, tópicos recolhíveis, tempo por tópico e selo de tempo, hora de início e tópicos concluídos, modo foco/imersivo, referências bíblicas no texto, anexos, importar/exportar Word (nota e pasta em zip), colar do Word mantendo recuos, salvar no aparelho e sincronizar.
7. **Bíblia e anotações** (separado) — leituras Pessoal/Família/Reunião, metas (Ordem, Cronológica, 1 ano, Dias, Pers.), "Marcar capítulos lidos", "Continuar", pontos altos com filtro, "Para comentar" e "Modo comentário", importação do JW Library, Bíblia só via EPUB.
8. Grandes Eventos · 9. Relatórios e backup · 10. Meu Perfil · 11. Perguntas frequentes

Cada tema: passos numerados, miniatura desenhada com os nomes reais, botão "Abrir esta tela".

```text
┌───────────────────────────────┐
│ ‹  Ajuda                      │
│ ┌───────────────────────────┐ │
│ │ 🔍 Buscar na ajuda        │ │
│ └───────────────────────────┘ │
│ ┌───────────────────────────┐ │
│ │ ▣ Painel inicial        ⌄ │ │
│ ├───────────────────────────┤ │
│ │ [Agenda][Esboços][Visita] │ │
│ │ [Pastoreio]   ● ○ ○ ○     │ │
│ │ 1 Deslize para o lado...  │ │
│ │ 2 Toque no ícone de...    │ │
│ │     [ Abrir esta tela › ] │ │
│ └───────────────────────────┘ │
│ ┌───────────────────────────┐ │
│ │ ▤ Modelos de visita     › │ │
│ ├───────────────────────────┤ │
│ │ ✎ Esboços               › │ │
│ ├───────────────────────────┤ │
│ │ ✦ Bíblia e anotações    › │ │
│ └───────────────────────────┘ │
│                          (?)  │
└───────────────────────────────┘
```

Como garanto fidelidade: antes de escrever, abro cada tela (Painel, Modelos, Esboços) no tamanho de celular e anoto o nome exato de cada botão, aba e pílula. Todo nome citado fica ligado à tradução real, e o teste automático acusa se algum deixar de existir.

Para você revisar antes: como no tema Meu Perfil, posso colocar primeiro o texto completo dos 4 temas no plano e só depois gravar.

## (02) Primeira entrada abre "Meu Perfil"

Concordo, com um ajuste: hoje, depois de criar a conta, o superintendente vai para "Congregações" e quem passa pela tela de boas-vindas vai para o Painel. Proposta:
- Só na **primeira** entrada da conta, abrir "Meu Perfil" na aba "Dados pessoais", com um aviso no topo:

```text
┌───────────────────────────────┐
│ ‹  Meu Perfil                 │
│ ┌───────────────────────────┐ │
│ │ 👋 Bem-vindo! Complete    │ │
│ │ seus dados para começar.  │ │
│ │ ☐ Circuito                │ │
│ │ ☐ Nome e telefone         │ │
│ │ ☐ PIN offline             │ │
│ │ [ Ir para o Painel › ]    │ │
│ └───────────────────────────┘ │
│ [Dados pessoais][Recursos]... │
│ Circuito ____________         │
└───────────────────────────────┘
```
- Os itens se marcam sozinhos quando preenchidos; "Ir para o Painel" fecha o aviso para sempre.
- Anciãos e esposa (código de convite) não são afetados; nas entradas seguintes tudo segue igual.
- Login, PIN e biometria não são alterados.

## Detalhes técnicos
- `help-content.ts`: novos tópicos `dashboard`, `visit-templates`; `outlines-bible` vira `outlines` + `bible`; novas miniaturas em `_app.ajuda.tsx`; testes de rota/labelKey estendidos.
- Primeira entrada: flag local `firstRun.done.<userId>` em localStorage; `cadastro.superintendente.tsx` e `onboarding.tsx` redirecionam para `/perfil?welcome=1` quando a flag não existe; card de boas-vindas em `_app.perfil.tsx`. Sem mudança no banco.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
