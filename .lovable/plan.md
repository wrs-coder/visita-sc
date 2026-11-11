# Revisão geral de todas as telas: Ajuda, vídeos e traduções

## O que encontrei
1. **Espanhol incompleto:** faltam 24 textos (Recados do casal e o bloco "Hoje" do Cronograma).
2. **Inglês:** falta 1 texto (aba "Casal" da esposa).
3. **Frases fixas em português:** cerca de 30 telas continuam em português mesmo com o app em inglês ou espanhol. Entre elas: Grandes Eventos, Controle de tempo, Congregações, Itinerário, Anciãos, Esboços, Bíblia, Área da esposa e Painel.
4. **A Ajuda só existe em português.** Ela também não explica o Controle de tempo, o relatório em PDF, o tempo digitado no cartão, o menu "..." de cada designação nem o "Finalizar visita".
5. **Repetições:** não encontrei nenhuma além das que já tiramos.

## Etapas (para controlar o gasto)
**Etapa 1 (mais barata, faço agora):**
- Cartão "Vídeos tutoriais" no topo da Ajuda e no rodapé do site visitasc.com.br.
- Novo tópico "Controle de tempo" na Ajuda; atualizar "Grandes Eventos" e "Painel" (Finalizar visita).
- Completar os 25 textos que faltam em inglês e espanhol.

**Etapa 2 (opcional, a mais cara):** traduzir as frases fixas das cerca de 30 telas e a própria Ajuda. Só faço se você pedir, e em partes: uma área por vez, para você controlar o gasto.

```text
┌──────────────────────────┐
│ ‹  Ajuda                 │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ ▶  Vídeos tutoriais  │ │
│ │ Aprenda passo a passo│ │
│ │            Abrir  ›  │ │
│ └──────────────────────┘ │
│  🔍 Buscar na ajuda      │
│  Controle de tempo     › │
│  Grandes Eventos       › │
└──────────────────────────┘
```
- Link: https://www.youtube.com/playlist?list=PLDZHSUoC8A3g (você confirmou).
- Sem internet, o cartão avisa "Precisa de internet".

## Detalhes técnicos
- Link da playlist numa constante única, aberto pelo navegador do sistema.
- O `help-content.test.ts` continua validando rotas e chaves; um teste novo confere se en/es têm todas as chaves de pt.
- Sem mudança no banco de dados.
