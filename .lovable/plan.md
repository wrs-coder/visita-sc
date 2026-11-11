# Revisão geral de todas as telas: traduções, Ajuda e vídeos

## O que encontrei
1. **Espanhol incompleto:** faltam 24 textos (Recados do casal, bloco "Hoje" do Cronograma) e cerca de 73 ainda estão em português.
2. **Inglês:** falta 1 texto (aba "Casal" da esposa).
3. **Frases fixas em português em todo o app:** cerca de 30 telas continuam em português mesmo com o app em inglês ou espanhol. As que mais têm:
   - Grandes Eventos, Controle de tempo, Modelos de carta
   - Congregações, Itinerário (semanas livres e importação), Configurações
   - Programa e Modelo dos Anciãos, Esboços, Lembretes de eventos
   - Leitura da Bíblia (trilhas e Pontos altos), Área da esposa, Pacotes de visita, Modelos
   - Painel, Perfil, Termos, página de confirmação do orador, avisos de exclusão
4. **A Ajuda só existe em português:** os passos aparecem em português, qualquer que seja o idioma do app.
5. **A Ajuda está desatualizada:** não explica o Controle de tempo, o relatório em PDF, o tempo digitado no cartão, o menu "..." de cada designação (PIN, Novo link, Informar próximo orador), a regra de 1 minuto, nem o "Finalizar visita".
6. **Repetições:** não encontrei nenhuma além das que já tiramos. "Informações adicionais" só aparece em eventos antigos, e isso está correto.

## O que vou fazer
**A. Traduções (todas as telas):** completar o inglês e o espanhol. Passar para os três idiomas as frases fixas de todas as telas listadas acima. A Ajuda também ganha versão em inglês e espanhol. Vou trabalhar em lotes, uma área por vez, conferindo cada uma, para não quebrar nada.

**B. Ajuda:**
- Novo tópico **"Controle de tempo"**: toque no relógio para iniciar ou parar; dois toques zeram; Regressivo ou Cronômetro; sino verde ou vermelho; "Programa atrasado"; Concluir evento; relatório em PDF; janela sobre outros apps.
- Atualizar o tópico **"Grandes Eventos"** com as novidades de hoje.
- Explicar o **"Finalizar visita"** no tópico do Painel.

**C. Vídeos tutoriais (playlist do YouTube):**
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
- Um cartão "Vídeos tutoriais" no topo da Ajuda abre a playlist.
- O mesmo link fica no rodapé da página inicial do site visitasc.com.br.
- Sem internet, o cartão avisa "Precisa de internet".
- Link: https://www.youtube.com/playlist?list=PLDZHSUoC8A3g. **Confira:** links de playlist costumam ser bem mais longos, e esse parece cortado. Se estiver, me mande o link completo.

## Detalhes técnicos
- Frases fixas em `src/routes` e `src/components` viram chaves em pt/en/es; a Ajuda usa chaves por idioma; `help-content.test.ts` continua validando rotas e chaves.
- Teste novo garante que en/es têm todas as chaves de pt.
- Link da playlist numa constante única, aberto pelo navegador do sistema.
- Sem mudança no banco de dados.
