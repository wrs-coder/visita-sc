# Revisão geral: traduções, Ajuda e canal de vídeos

## O que encontrei
1. **Espanhol incompleto:** 24 textos faltam (Recados do casal, bloco "Hoje" do Cronograma) e cerca de 73 ainda aparecem em português.
2. **Inglês:** falta 1 texto (aba "Casal" da esposa).
3. **Telas novas sem tradução:** o Controle de tempo e os Grandes Eventos têm cerca de 57 frases escritas direto em português ("Concluir evento", "Detalhes do evento", "Resumo", "Falta inserir o tempo", menus "..." etc.). Em inglês e espanhol elas aparecem em português.
4. **Ajuda desatualizada:** o tópico "Grandes Eventos" não fala do Controle de tempo, do relatório em PDF, do tempo digitado no cartão, do menu "..." (PIN, Novo link, Informar próximo orador), nem da regra de 1 minuto. Também não explica o "Finalizar visita".
5. **Coisas que sobraram:** "Informações adicionais" só aparece em eventos antigos (está certo assim). Não encontrei mais nada repetido.

## O que vou fazer
**A. Traduções:** completar o espanhol e o inglês. Passar todas as frases do Controle de tempo e dos Grandes Eventos para os três idiomas.

**B. Ajuda (/ajuda):**
- Novo tópico **"Controle de tempo"**: tocar no relógio para iniciar ou parar; dois toques zeram; Regressivo ou Cronômetro; sino verde ou vermelho; "Programa atrasado"; Concluir evento; relatório em PDF; janela sobre outros apps.
- Atualizar o tópico **"Grandes Eventos"**: tempo direto no cartão, menu "..." de cada designação, 1 min a menos ao importar e +1 min no horário automático.
- Explicar o **"Finalizar visita"** no tópico do painel.

**C. Canal de vídeos (YouTube não listado):**
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
│  ...                     │
└──────────────────────────┘
```
- Um cartão "Vídeos tutoriais" no topo da Ajuda, que abre o canal no YouTube.
- O mesmo link no rodapé do site visitasc.com.br.
- Sem internet: o cartão mostra "Precisa de internet".
- Minha opinião: coloque nos dois lugares. No app, ajuda quem já usa. No site, ajuda quem ainda está pensando em instalar.
- **Preciso que você mande o link do canal.**

## Detalhes técnicos
- Chaves novas em pt/en/es; `help-content.test.ts` continua validando rotas e chaves; novo teste garante que en/es têm todas as chaves de pt.
- Link do YouTube em uma constante única, aberto com `window.open`/Browser do Capacitor.
- Sem mudança no banco de dados.
