# Tela de Ajuda dentro do aplicativo (sugerida em 07/10/2026)

Essa ideia foi sugerida em 07/10, mas na época você escolheu fazer só o manual em PDF. Ela nunca virou um plano salvo. Esta é a versão econômica: só texto e ícones, sem capturas de tela, para gastar poucos créditos.

## Como fica

```text
┌─────────────────────────────┐
│ ‹  Ajuda                    │
│ ┌─────────────────────────┐ │
│ │ 🔍 Buscar (ex.: PIN)     │ │
│ └─────────────────────────┘ │
│ ▸ Primeiros passos e PIN    │
│ ▾ Preparação da visita      │
│   1. Abra Circuito ›        │
│      Itinerário             │
│   2. Toque em + Visita ...  │
│ ▸ Rotina diária             │
│ ▸ Esboços e Bíblia          │
│ ▸ Grandes Eventos           │
│ ▸ Encerramento e relatórios │
│ ▸ Perguntas frequentes      │
└─────────────────────────────┘
```

- Novo item "Ajuda" (ícone ?) no menu lateral.
- Os mesmos 7 temas do manual, como blocos que abrem e fecham.
- Uma busca no topo filtra os passos enquanto você digita.
- Funciona sem internet, porque o texto vem junto com o app.
- Acesso só para o superintendente. A esposa e os anciãos não veem essa tela por enquanto.

## O que não muda
- Nenhuma tela que já existe muda, exceto o novo item no menu.
- Nenhuma mudança no banco de dados.
- Não sobe a versão e o aviso "O que há de novo" fica desligado.

## Detalhes técnicos
- Nova rota `/ajuda` dentro da área do superintendente, com conteúdo em um arquivo de dados (`help-content.ts`), em pt.
- Usa o mesmo componente de bloco recolhível que já existe, busca simples em texto sem acentos.
- Um teste pequeno para a busca, por exemplo: "pin" encontra o tema de segurança.
