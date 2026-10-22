# Acesso correto às novas abas + cartões com títulos na Semana da Visita e no Resumo da Semana

## 1. Corrigir a falha de acesso
- Os botões "Semana da Visita · Anotações · Estudo Pessoal" só aparecem no **acesso da esposa** (código criado em "Meu perfil").
- No acesso do **corpo de anciãos** (código da congregação), os botões somem e a tela mostra só a Semana da Visita, como antes.
- Se um aparelho de ancião tiver ficado com "Anotações" ou "Estudo Pessoal" escolhido, volta sozinho para a Semana da Visita.
- Nada muda no banco nem no que cada acesso pode ver do servidor.

## 2. Títulos descritivos em cada informação (mesmo padrão do painel do superintendente)
Cada evento vira um bloco com o nome e o horário no topo, e embaixo cada informação com seu título:

```text
Manhã · 09:00
  Local de encontro           Salão do Reino
  Acompanhante                João Silva
  Telefone de contato         (11) 99999-9999
  Observações                 ...
```

- Informação vazia não aparece; blocos separados por linha fina.
- Em tela estreita, o título fica em cima do valor (sem texto espremido na vertical).

Aplicado nas abas:
- **Cronograma, Estudos e Revisitas, Reunião de Campo, Refeições, Transporte** e **Reuniões** de:
  - "Semana da Visita" da esposa;
  - acesso do corpo de anciãos;
  - "Resumo da Semana" do superintendente.
- Mesmos dados, mesma ordem, mesmas regras do que a esposa não vê (observações ocultas continuam ocultas).

## O que não muda
Banco, permissões, PDFs, botões de editar/ocultar do superintendente, aba "Hoje", Pastoreios, Checklist e Recados.

## Detalhes técnicos
- `visitante.painel.tsx`: renderizar `GuestSectionNav`/`GuestWorkspace` só quando `snap.wifeMode`; caso contrário forçar `guestSection = "week"`.
- Criar um componente compartilhado `InfoList` (`<dl>` `grid-cols-1 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]`, filtra vazios) em `src/components/visit-summary/`.
- Usar `InfoList` nos `TabsContent` cron/estudos/campo/ref/trans/reunioes de `VisitSummaryView.tsx` e de `visitante.painel.tsx`, reaproveitando rótulos i18n já existentes (pt/en/es); só cores por tokens.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`; conferir com Playwright o Resumo da Semana em 393px e 1280px.
