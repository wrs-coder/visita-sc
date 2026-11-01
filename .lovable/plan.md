# Ajuda: Meu Perfil + correção Grandes Eventos + Lembretes mais completos

## (01) Novo tema na Ajuda: "Meu Perfil"

Conferido na tela atual (/perfil): 3 abas — **Pessoal**, **Recursos**, **Configurações**.

- **Pessoal**: Circuito, Acesso da esposa (código de convite), Dados pessoais, Nome de usuário, E-mail, Alterar senha.
- **Recursos**: Bíblia (Gerenciar Bíblia), Apoiar o desenvolvedor.
- **Configurações**: Idioma, Backup (Gerar backup / Restaurar backup), Sincronização, PIN offline, Lembretes, Modo imersivo.

Cada passo cita o nome exato da tela (pela chave de tradução), e o teste automático da Ajuda passa a conferir também esses nomes. "Abrir esta tela" leva a /perfil já na aba certa.

```text
┌───────────────────────────────┐
│ ‹  Ajuda                      │
├───────────────────────────────┤
│ ▾ Meu Perfil                  │
│  ┌─────────────────────────┐  │
│  │(Pessoal)(Recursos)(Conf.)│ │  ← miniatura
│  └─────────────────────────┘  │
│  PESSOAL                      │
│  1 Circuito e dados pessoais  │
│  2 Acesso da esposa: código   │
│  3 Nome de usuário, e-mail,   │
│    alterar senha              │
│  RECURSOS                     │
│  4 Gerenciar Bíblia (EPUB)    │
│  5 Apoiar o desenvolvedor     │
│  CONFIGURAÇÕES                │
│  6 Idioma                     │
│  7 Gerar / Restaurar backup   │
│  8 Sincronização, PIN offline │
│  9 Lembretes, Modo imersivo   │
│  [ Abrir esta tela  › ]       │
└───────────────────────────────┘
```

## (02) Correção em Grandes Eventos, passo 3

Novo texto:
"Cada orador recebe um link curto (que pode ter PIN) para confirmar a designação, e a confirmação aparece na hora para o superintendente."

## (03) Lembretes mais completos (proposta, para você escolher)

Hoje: liga/desliga, uma antecedência (15 min, 30 min, 1 h, 1 dia) e escolha dos tipos de compromisso. Tudo no próprio aparelho, funciona sem internet.

Melhorias possíveis, todas no aparelho, sem mudar o servidor:
1. **Antecedência por tipo**: ex. reunião 1 h antes, refeição 15 min.
2. **Dois avisos por compromisso**: ex. 1 dia antes + 30 min antes.
3. **Resumo do dia**: um aviso de manhã (horário escolhido) com a agenda do dia.
4. **Horário de silêncio**: não avisar entre, por exemplo, 22h e 6h.
5. **Adiar** (10 min) direto pela notificação, e tocar abre o compromisso.
6. **Lembretes de Grandes Eventos**: avisar quando um orador confirma ou quando faltam X dias sem confirmação.
7. **Lembrete do meu esboço**: aviso para ensaiar o discurso X dias antes.

```text
┌───────────────────────────────┐
│ Lembretes                [●] │
├───────────────────────────────┤
│ Resumo do dia     07:00   [●] │
│ Horário de silêncio 22–06 [●] │
├───────────────────────────────┤
│ POR TIPO        1º aviso 2º   │
│ Reunião          1 h    1 dia │
│ Campo           30 min   —    │
│ Refeição        15 min   —    │
│ Transporte       1 h     —    │
├───────────────────────────────┤
│ [ Enviar lembrete de teste ]  │
└───────────────────────────────┘
```

Proposta: fazer agora 1 a 5 (são ajustes no que já existe). Os itens 6 e 7 ficam para depois, porque precisam de novas fontes de dados.

## Detalhes técnicos
- help-content.ts: novo tópico `profile` com labelKeys (profile.tabPersonal/tabFeatures/tabSettings, wifeAccess.title, personalData, usernameSection.title, email, changePassword, bibleManager.manage, support.title, language, backupSection, immersiveTitle…), rota /perfil; texto do passo 3 em big-events; o help-content.test.ts já cobre isso.
- Aba inicial: /perfil lê `visita-sc:profile-tab`; vou aceitar `?tab=` sem mudar o comportamento atual.
- Lembretes: ReminderPrefs ganha campos opcionais (`leadByKind`, `second`, `digest`, `quiet`); quem já tem configuração antiga continua igual. Os avisos continuam respeitando MAX_REMINDERS; adiar usa uma ação da notificação local. Vou adicionar testes para silêncio, segundo aviso e antecedência por tipo.
- Sem mudanças no banco de dados, no login ou no PIN.
