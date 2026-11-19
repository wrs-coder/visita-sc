# Versão 6.0.0 — novidades, Ajuda e texto da Play Store

## Concordo com a versão 6
Desde a 5.8.0 entraram mais de 100 mudanças, incluindo telas novas (Controle de tempo da reunião, Quadro de anúncios, Pauta com os anciãos) e a aba "Pastoreio" virou "Anciãos". É uma mudança grande: **5.8.0 → 6.0.0** (código interno do Android 47 → 48).

## O que há de novo (aparece uma vez ao abrir o app)
Cada parte só aparece para quem é afetado:

```text
┌─────────────────────────────┐
│  O que há de novo · 6.0.0   │
│ ─────────────────────────── │
│ ⏱ Controle de tempo         │  SC
│ 📋 Quadro de anúncios        │  SC
│ 🗂 Pauta com os anciãos      │  SC
│ 👥 Para os anciãos           │  SC + anciãos
│ ✨ Melhorias gerais          │  todos
│        [ Entendi ]          │
└─────────────────────────────┘
```

**SC**
- Controle de tempo da reunião: importa a apostila (.zip/.rtf), conselho, oradores, semana da visita, boia com tempo, iniciar/pausar/anterior/próxima e três tamanhos.
- Quadro de anúncios em PDF: modelos Completo e Simplificado, uma folha, horário 24h, Reuniões Especiais, campo com manhã/tarde, orações e frases opcionais.
- Pauta da reunião com os anciãos: tópicos e cartões à sua escolha, modelos sincronizados, prazo, Informações do SC, Resposta do SC, decisão Designar/Não designar, S-303, anexos, tela cheia e três estilos de PDF.
- Pastoreio: agendar e salvar sem sair da tela, cronômetro flutuante no Modo Esboço, fotos/vídeos em tela cheia, Grandes Eventos apagados não voltam.

**Anciãos (aparece também para quem entra pelo código "Corpo de anciãos")**
- Nova Pauta da reunião com os anciãos na aba "Anciãos" (antes "Pastoreio") e na pílula "Pauta" do Programa da visita.
- Preencher os cartões liberados (Todos ou C.Serviço) até o prazo; depois fica só leitura e funciona sem internet.
- Exportar a pauta em PDF no modelo escolhido pelo superintendente; links das fontes abrem direto pelo nome.

**Todos**
- "Para comentar" recolhível e só com estrela; correções gerais.

A esposa não vê nada da pauta.

## Ajuda
Novos tópicos (usando os nomes reais dos botões): Controle de tempo da reunião, Quadro de anúncios, Pauta com os anciãos (SC) e "Pauta – como preencher" (anciãos). O teste da Ajuda confere que cada tela e botão citado existe.

## Texto para a Play Store (até 500 caracteres, entregue no chat)
Rascunho (≈470 caracteres):
> Versão 6: Controle de tempo da reunião com importação da apostila e boia de tempo; Quadro de anúncios em PDF nos modelos Completo e Simplificado; nova Pauta da reunião com os anciãos, montada do seu jeito, com prazo, PDF em três estilos, anexos e uso sem internet. Os anciãos preenchem e exportam a pauta pelo próprio acesso. Pastoreio mais rápido, tela cheia para fotos e vídeos e várias correções.

## Detalhes técnicos
- `package.json` e `android/app/build.gradle`: 6.0.0 / versionCode 48.
- `release-notes.ts`: nova entrada 6.0.0 no topo, seções com `audience` (super / elder / all); `RELEASE_NOTES_VERSION = "6.0.0"`; ajustar `release-notes.test.ts`/`whats-new.test.ts` e garantir que o filtro mostre a parte "elder" para acesso por código.
- `help/help-content.ts`: novos tópicos via `helpTopicsFor`; rodar `help-content.test.ts`.
- Rodar tsc e testes.
