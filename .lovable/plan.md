# Ajuda: Meu Perfil + correção Grandes Eventos + Lembretes mais completos

## (01) Novo tema na Ajuda: "Meu Perfil"

Conferido na tela atual (/perfil): 3 abas — **Pessoal**, **Recursos**, **Configurações**.

- **Pessoal**: Circuito, Acesso da esposa (código de convite), Dados pessoais, Nome de usuário, E-mail, Alterar senha.
- **Recursos**: Bíblia (Gerenciar Bíblia), Apoiar o desenvolvedor.
- **Configurações**: Idioma, Backup (Gerar backup / Restaurar backup), Sincronização, PIN offline, Lembretes, Modo imersivo.

Cada passo cita o nome exato da tela (pela chave de tradução), e o teste automático da Ajuda passa a conferir também esses nomes. "Abrir esta tela" leva a /perfil já na aba certa.

### Texto que será inserido (para sua revisão)

**Título:** Meu Perfil
**Resumo:** Seus dados, o acesso da esposa, a Bíblia, o idioma, o backup e as preferências do aparelho, organizados em três abas.

**Como abrir:** Toque em "Meu Perfil" no menu lateral. No alto da tela aparecem as abas "Pessoal", "Recursos" e "Configurações".

**Aba "Pessoal"**
1. Em "Circuito", digite o circuito que você serve. O circuito fica ligado à sua conta, e o nome do circuito permite entrar na conta.
2. Em "Acesso da esposa", gere o código de convite e envie para sua esposa. Com ele, ela entra no aplicativo e usa o próprio espaço de estudo e anotações, separado do seu.
3. Em "Dados pessoais", confira e atualize seu nome e telefone.
4. Em "Nome de usuário", escolha o nome que você pode usar para entrar.
5. Em "E-mail", veja o e-mail da sua conta.
6. Em "Alterar senha", digite a nova senha e confirme.

**Aba "Recursos"**
7. Em "Bíblia", toque em "Gerenciar Bíblia" para importar ou trocar o arquivo EPUB da Tradução do Novo Mundo. A Bíblia fica no aparelho e funciona sem internet. Baixe a Bíblia no site jw.org.
8. Em "Apoiar o desenvolvedor", veja como ajudar a manter o aplicativo.

**Aba "Configurações"**
9. Em "Idioma", escolha o idioma do aplicativo. Se você não escolher, ele segue o idioma do celular.
10. Em "Backup", toque em "Gerar backup" para salvar uma cópia dos seus dados, ou em "Restaurar backup" para recuperar uma cópia salva.
11. Em "Sincronização", veja se seus dados já foram enviados para a nuvem.
12. Em "PIN offline", configure o PIN e a biometria para entrar sem internet.
13. Em "Lembretes", ligue os avisos dos compromissos da agenda e escolha com quanta antecedência quer ser avisado.
14. Em "Modo imersivo", esconda a barra de status nas telas de leitura e escrita. Para vê-la de novo, deslize de cima para baixo.

**Dica:** O aplicativo lembra a última aba que você abriu.

Observação: os nomes entre aspas vêm do aplicativo e serão conferidos pelo teste automático. Se algum estiver diferente na tela (por exemplo, "Dados pessoais"), o teste falha e eu corrijo o texto antes de entregar.

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
