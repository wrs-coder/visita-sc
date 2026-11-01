# Ajuda: correção do Painel, novo tema Notas Privadas e nova ordem

## 1. Correção — Painel inicial, passo 6
Novo texto:
> 6. Em “Pastoreio”, ficam os pastoreios e encorajamento agendados, as recomendações, assuntos locais e o checklist da congregação.

## 2. Novo tema — Notas Privadas (abre /notas)
Textos conferidos com a tela atual (nomes entre aspas vêm do aplicativo):

1. No menu lateral, toque em “Notas Privadas”. Elas são “Visíveis apenas para você”.
2. Em “Congregação (apenas para esta aba)”, escolha a congregação das notas.
3. As notas ficam em 6 abas: “Notas livres”, “Pastoreio”, “S-303”, “Oradores”, “Recomendados” e “Petições”.
4. Em cada aba, toque no botão de nova nota (ex.: “Nova nota livre”, “Nova visita de pastoreio”, “Novo registro S-303”).
5. Em “Pastoreio”, preencha “Data da visita”, “Acompanhante”, “Nome dos envolvidos” e “Informações adicionais”.
6. Em “S-303”, registre “Destaques positivos e elogios”, “Pontos para encorajar (Atos 11:23)” e “Pontos preocupantes (Tito 1:5)”.
7. Use “Buscar por título ou conteúdo” e as datas “De” e “Até” para filtrar.
8. Para exportar, marque as notas (ou “Selecionar desta aba”) e toque em “Exportar PDF” ou “WhatsApp”. O PDF sai como “Notas Privadas — Confidencial”.
9. Sem internet, a nota é criada no aparelho e enviada depois. Ao encerrar uma visita, as Notas Privadas são preservadas.

Miniatura:
```text
┌──────────────────────────────┐
│ Notas Privadas               │
│ Visíveis apenas para você    │
│ [Congregação ▾]              │
│ (Notas livres)(Pastoreio)    │
│ (S-303)(Oradores)            │
│ (Recomendados)(Petições)     │
│ [+ Nova nota livre]          │
│ [Exportar PDF] [WhatsApp]    │
└──────────────────────────────┘
```

## 3. Nova ordem dos temas
1 Meu Perfil · 2 Modelos de visita · 3 Circuito e visitas · 4 Painel inicial · 5 Esboços · 6 Grandes Eventos · 7 Bíblia e anotações · 8 Notas Privadas · 9 Semana da visita · 10 Relatórios e backup · 11 Entrada e segurança · 12 Perguntas frequentes

Tela Ajuda (só muda a ordem e entra um item):
```text
┌──────────────────────────────┐
│ Ajuda                        │
│ [🔍 Buscar na ajuda]         │
│ [Ir para uma tela ou ação]   │
│ ▸ Meu Perfil                 │
│ ▸ Modelos de visita          │
│ ▸ Circuito e visitas         │
│ ▸ Painel inicial             │
│ ▸ Esboços                    │
│ ▸ Grandes Eventos            │
│ ▸ Bíblia e anotações         │
│ ▸ Notas Privadas   (novo)    │
│ ▸ Semana da visita           │
│ ▸ Relatórios e backup        │
│ ▸ Entrada e segurança        │
│ ▸ Perguntas frequentes       │
└──────────────────────────────┘
```

## Detalhes técnicos
- `src/lib/help/help-content.ts`: ajustar passo 6 do tema `dashboard`; novo tema `private-notes` (rota `/notas`, labelKeys `sidebar.privateNotes`, `notes.subtitle`, `notes.congregationLabel`, `notes.categories.*.label/add`, `notes.pastoral.*`, `notes.structured.s303.*`, `notes.filters.*`, `notes.export.*`); reordenar o array `HELP_TOPICS`.
- `src/routes/_app.ajuda.tsx`: miniatura `notes-tabs` com as pílulas reais.
- `help-content.test.ts`: novo teste fixando a ordem dos 12 temas; testes existentes já validam rota e chaves.
- Nada muda em dados, servidor ou outras telas.
