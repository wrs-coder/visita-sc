# Mockup visual: aba única Modelos, Pacotes da visita e semanas sem congregação

Primeira etapa: apenas telas de apresentação com dados fictícios. Nenhum botão salva nada (só registra o toque para teste), nada muda no banco nem nas telas atuais. Depois da sua aprovação visual, a lógica real vira um plano separado.

## Onde ver
Uma página de prévia separada, **"Prévia dos Modelos"**, acessível pelo endereço `/previa-modelos` (sem item novo na barra lateral). Ela tem 4 abas internas para alternar entre os mockups abaixo. As telas reais continuam intactas.

## Tela A — Aba única "Modelos" (celular 393px)

```text
+-----------------------------------------+
| Modelos                                 |
| [Programação][Checklist][Campo]         |  <- pílulas roláveis
| [Discursos][Anciãos][Pacotes]           |
+-----------------------------------------+
| Modelo: [ Visita padrão         v ] ... |  <- seletor + menu 3 pontos
|         (Renomear/Duplicar/Excluir/     |
|          Exportar/Importar)             |
| > Informações adicionais (recolhido)    |
+-----------------------------------------+
| [Recolher tudo]                         |
| v SEGUNDA                               |
|   > Manhã · 08:30 · Casa em casa    [x] |
|   > Tarde · 15:00 · Testemunho      [x] |
| > TERÇA (2 itens)                       |
| > QUARTA (1 item)                       |
+-----------------------------------------+
| [+ Adicionar]          [ Salvar modelo ]|  <- barra fixa no rodapé
+-----------------------------------------+
```

- Item aberto mostra os campos principais (dia, turno, hora, modalidade, território) e um "Mais detalhes" recolhido para observações e oração.
- No computador, a lista de modelos fica numa coluna estreita à esquerda e o editor à direita.
- Mesma silhueta aplicada a Programação, Reuniões de campo e Anciãos (seções e eventos no lugar de dias).

## Tela B — Pacotes da visita (pílula "Pacotes")

```text
+-----------------------------------------+
| Pacotes da visita      [Importar][+ Novo]|
+-----------------------------------------+
| [Pacote] Visita de primavera        ... |
|  Programação ......... Visita padrão    |
|  Checklist ........... Checklist base   |
|  Reuniões de campo ... Campo 2 turnos   |
|  Reuniões/discursos .. Semana normal    |
|  Anciãos ............. (vazio)          |
|  [Editar]  [Exportar]                   |
+-----------------------------------------+
| [Pacote] Visita com congresso       ... |
|  5 de 5 modelos · "1 não encontrado" !  |
+-----------------------------------------+
```

- "Editar" abre uma janela com 5 seletores (um por tipo de modelo) e o nome do pacote.
- Aviso discreto em âmbar quando um modelo do pacote não existe mais.
- Rodapé da tela: "Guardado só neste aparelho · use Exportar para levar a outro".

## Tela C — Itinerário: escolher pacote na visita

```text
+-----------------------------------------+
| Nova visita                             |
| Congregação [ Central            v ]    |
| Datas       [ 03/11 ] a [ 09/11 ]       |
| Pacote da visita [ Visita de primavera v]|
|  "Preenche os 5 modelos abaixo"         |
| > Modelos individuais (5 escolhidos)    |  <- recolhido
|              [Cancelar] [Salvar]        |
+-----------------------------------------+
```

## Tela D — Itinerário: semanas sem visita

```text
+-----------------------------------------+
| Itinerário        [+ Visita][+ Semana]  |
+-----------------------------------------+
| 27/10–02/11  Congregação Central        |
| 03/11–09/11  [Semana de pioneiro]       |  <- selo próprio, sem congregação
| 10/11–16/11  Congregação Norte          |
| 17/11–23/11  [Semana livre]             |
+-----------------------------------------+
```

- "+ Semana" abre janela curta: tipo (Semana de pioneiro / Semana livre) e data de início; nenhuma congregação.

## Estilo
- Cores e bordas só dos tokens existentes (cartões, `section-accent`, `primary`, `muted`); selos de semana com cores de destaque já usadas na Agenda.
- Ícones Lucide: FileStack, ListChecks, MapPin, Layers, BookOpen, Package, CalendarOff, Sun.
- Sem imagens geradas.

## Detalhes técnicos
- Nova rota estática `src/routes/_app.previa-modelos.tsx` com `head()` próprio; componentes em `src/components/mockups/` (`TemplatesHubMockup`, `PackagesMockup`, `ItineraryPackageMockup`, `ItineraryWeeksMockup`) com arrays fictícios locais e handlers `console.log`.
- Reutiliza `Card`, `Button`, `Select`, `Dialog`, `DropdownMenu`, `Badge`, `Collapsible` do shadcn; pílulas com `ToggleGroup` ou botões arredondados com rolagem horizontal.
- Nenhuma alteração em rotas existentes, server functions, banco ou sidebar. Validar com `bunx tsgo --noEmit` e captura no navegador em 393px e 1280px.
- Na execução, registrar no roadmap: "Mockup visual dos Modelos/Pacotes/Semanas — aguardando validação".
