# Rascunhos e cronômetro — diagnóstico e melhorias

## O que encontrei no código

### Rascunho dos Esboços pessoais
- O texto digitado fica só na memória da tela até tocar em "Salvar". Não há gravação automática nem aviso ao sair. Se o app fechar, o celular reiniciar ou a pessoa trocar de tela, o que foi escrito desde o último "Salvar" se perde.

### Rascunho de Reuniões e Discursos
- Funciona bem: guarda no aparelho, avisa ao sair e mantém o que falhou para tentar de novo.
- Pontos fracos: não mostra quais campos estão pendentes, as mensagens estão fixas em português (sem tradução EN/ES), e um rascunho antigo esquecido continua aparecendo sem dizer de quando é.

### Cronômetro e alerta de "esqueceu de iniciar"
1. **Falha confirmada — alerta pode sumir:** o aviso "Esqueceu de iniciar?" só aparece na primeira tela que abriu o esboço. Se ela fechar (ex.: sair da tela cheia) e outra continuar aberta, o aviso nunca mais aparece naquele esboço.
2. **Falha confirmada — perder tempo ao mudar o alvo:** ao diminuir o tempo alvo com o cronômetro correndo (ex.: passou 10 min e escolhe 5 min), o tempo já decorrido é cortado para 5 min sem aviso.
3. **Cronômetro esquecido ligado:** se ficou rodando e o esboço é reaberto no dia seguinte, aparece um tempo enorme (horas). No modo progressivo ele nunca para e mantém a tela acesa para sempre.
4. **"Não lembrar novamente"** só vale até fechar o app; depois o aviso volta. O texto promete mais do que faz.
5. Avisos de "falta 1 minuto / acabou / passou X min" usam só vibração e cor; sem som e sem aviso se a tela estiver desligada.

## O que será feito (sem mexer em banco, login ou formato dos esboços)

### Esboços pessoais
1. Gravação automática do rascunho no aparelho a cada pausa na digitação (cerca de 1,5 s) e ao sair do app.
2. Ao reabrir um esboço com rascunho não salvo: faixa discreta "Há alterações não salvas de HH:MM — Recuperar / Descartar".
3. Aviso ao trocar de esboço ou sair da tela com alterações não salvas.
4. Indicador pequeno "Rascunho guardado" / "Salvo" ao lado do botão Salvar.

### Reuniões e Discursos
5. Mostrar "Rascunho de HH:MM, N alterações" e destacar os campos pendentes.
6. Traduzir as mensagens do rascunho (PT/EN/ES).

### Cronômetro
7. Corrigir o alerta de esquecimento: quando a tela que mostrava o aviso fechar, outra tela aberta assume.
8. Corrigir a mudança de alvo: o tempo decorrido nunca é cortado; se passar do novo alvo, entra direto em "tempo excedido".
9. Cronômetro esquecido: se ficou rodando mais de 3 horas sem a tela aberta, ele é pausado e aparece "Cronômetro estava ligado desde HH:MM — Continuar / Zerar". O modo progressivo para sozinho em alvo + 30 min, liberando a tela.
10. "Não lembrar novamente" passa a valer de verdade para aquele esboço (guardado no aparelho), com opção de reativar no menu do cronômetro.
11. **Alerta de esquecimento mais inteligente:**
   - Se o orador já tinha escolhido um tempo para aquele esboço, ele aparece em destaque (botão grande "Iniciar 29 min"); as outras sugestões ficam menores ao lado. Sem tempo escolhido, continuam as sugestões de hoje.
   - Ao escolher o tempo, aparece a pergunta com duas opções: **Começar do zero** ou **Descontar o tempo decorrido**.
   - "Descontar" usa o tempo desde que o esboço foi aberto no modo esboço ou tela cheia até o toque na escolha (ex.: abriu às 19:30, tocou às 19:32 → o cronômetro já começa com 2 min passados dos 29).
12. **Controle de tempo por tópico:**
   - **No modo edição:** no cabeçalho de cada tópico há um botão pequeno de relógio para ligar o controle de tempo e informar os minutos daquele tópico. Se o título já tiver o tempo escrito (ex.: "(5 min)"), ele vem preenchido sozinho. Só os tópicos marcados entram no controle.
   - **Nos modos esboço e tela cheia:** cada tópico marcado mostra um selo discreto "até 19:42". Antes de iniciar o cronômetro, mostra os tempos acumulados ("+5", "+12"); depois que inicia, mostra o horário real. O tópico atual fica destacado e os concluídos ficam esmaecidos com um visto.
   - **Concluir tópico:** tocar no selo (ou no visto ao lado) marca o tópico como concluído. Os horários dos tópicos seguintes são recalculados a partir daquele momento, e uma pílula pequena junto ao cronômetro mostra "2 min atrasado" ou "1 min adiantado". Tocar de novo desfaz.
   - Tudo fica discreto: sem janelas, sem avisos que cobrem o texto. As marcações de "concluído" ficam só no aparelho e somem ao zerar o cronômetro.
   - Se a soma dos tópicos for diferente do tempo escolhido no cronômetro, aparece um aviso discreto no modo edição.
13. Som curto opcional nos avisos (liga/desliga no menu do cronômetro, desligado por padrão para não atrapalhar no púlpito).

## Fora deste lote (se quiser depois)
- Aviso do cronômetro com a tela desligada (notificação do celular) — exige novo APK e mais testes.

## Detalhes técnicos
- `consideracoes-campo.tsx`: rascunho em localStorage `visita-sc:note-draft:<noteId>` com debounce; limpar após `persistNote` com sucesso; `useBlocker` + `beforeunload` quando `draft` difere da nota salva; Capacitor `App` pause dispara gravação.
- `MeetingsDraftContext.tsx`: guardar `savedAt` junto do store (compatível com formato antigo), expor `isPending(table,id,field)`, strings via i18n.
- `OutlineInactivitySensor.tsx`: troca do mapa de contagem por lista ordenada de instâncias com assinatura; ao sair o dono, a próxima vira dona. Dispensa em localStorage.
- `use-outline-timer.ts`: `setTarget` preserva `elapsedSec`; `readSnapshot` detecta drift > 3 h → `isRunning:false` + flag `staleSince`; `computeTickAdvance` com teto para countup. Testes novos em `use-outline-timer.test.ts` para alvo, drift e teto.
- Alerta: registrar `openedAt` por esboço (sessionStorage) quando o modo esboço/tela cheia monta; "descontar" chama `setTarget` + `start` com `elapsedSec = agora - openedAt`. Tempo prévio vem de nova flag `targetChosen` no snapshot (compatível com dados antigos).
- Tempo por tópico: novo atributo opcional `minutes` no nó `outlineTopic` (`data-minutes`), editado no cabeçalho do modo edição. Esboços antigos continuam iguais (sem atributo = sem controle). Exportação DOCX e leitores ignoram o atributo.
- Funções puras em `src/lib/outline-schedule.ts` (com testes): `parseTopicMinutes`, `buildTopicSchedule(tópicos, startAt, concluídos)` → horário previsto por tópico e desvio (atraso/adiantamento). Concluídos guardados no aparelho por esboço (`visita-sc:topic-done:<id>`), limpos no `reset` do cronômetro.
- Selos e pílula de desvio renderizados na leitura (modo esboço / tela cheia) e no cabeçalho do `OutlineTimer`.
- Som via WebAudio (bip curto), pref em `timer-theme`/localStorage.
- Validação: `bunx tsgo --noEmit` e `bunx vitest run`; conferir no navegador o fluxo de rascunho (digitar, recarregar, recuperar).
