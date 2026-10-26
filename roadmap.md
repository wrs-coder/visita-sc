# Roadmap

- [x] 5.0.2 no aparelho: comando android:copy com conferência das telas, "Sobre este app" em Configurações, novidades mais confiáveis e área de texto estável com o teclado aberto.

- [ ] Produzir manual externo PDF e Markdown nos sete módulos aprovados, com capturas reais de smartphone anonimizadas e revisão visual de todas as páginas.

- [x] Corrigir o idioma exibido de Bíblias EPUB já importadas e futuras sem regravar versículos nem destaques; validar francês e português europeu.
- [x] Corrigir "spawn npx ENOENT" no Windows: shell:true em scripts/build-app-shell.mjs + fallback de montagem estática da casca (sem subprocesso).
- [x] Priorizar `visitasc.com.br` diretamente no aplicativo e validar o fallback de conexão da versão 4.1.3.
- [x] Corrigir o CORS real das server functions, validar a origem antes do login e publicar a correção Android 4.1.4.
- [x] Sonda de conexão resistente a redirecionamento 302 (redirect: manual), versão 4.1.5 (versionCode 8).
- [x] Normalizar identificadores das funções entre Windows/Linux e bloquear pacotes Android incompatíveis.
- [x] Remover a dependência de CORS do WebView usando HTTPS nativo no APK/AAB 4.2.2.
- [ ] (usuário) Remover domínio principal em Project Settings → Domains para ativar as 3 contingências reais.
- [ ] (usuário) Abrir chamado no suporte Lovable sobre falha regional de acesso a *.lovable.app.
- [x] Aplicar melhorias bíblicas ao esboço e à Tela Cheia, incluindo inserção direta do texto na nota.
- [x] Detectar citações bíblicas por bloco (parágrafo/lista), corrigindo links e avisos de referência com erro nos modos Esboço e Tela Cheia; completar abreviações 1Te/2Te/1Thess/2Thess.
- [x] Ativar otimização R8 e tratar exibição ponta a ponta (Android 15+), versão 4.2.4/versionCode 14.
- [x] Impedir que a imagem nativa de abertura reapareça sobre o editor durante rolagem, teclado e seleção de texto (4.2.6/versionCode 16).
- [x] Offline-First evolutivo — Fase 0 (base local): espelho `src/lib/local-db.ts` com carimbos, tombstones, cursor e resolução de conflito. Camada passiva, nenhuma tela alterada.
- [x] Offline-First evolutivo — Fase 1: carimbos `updated_at` + registro de exclusões no banco e download incremental (`src/lib/local-sync.ts`), ainda sem ligar nas telas.
- [x] Offline-First evolutivo — Fase 2: telas Refeições, Transporte e visita ativa lendo do espelho local (`src/lib/local-first.ts`), servidor continua sendo a fonte quando responde.
- [x] Offline-First evolutivo — Fase 3: caixa de saída + reconciliação de conflito (local-write + reconciliador ligados às telas).
- [x] Offline-First evolutivo — Fase 4: sincronização automática (local-auto-sync) + painel de estado no Perfil (SyncStatusCard); cursor incremental corrigido.
- [x] Sincronização automática reduzida a 2x/dia (manhã e tarde); botão manual continua livre.
- [x] Etapa A (offline-first): esboços/reuniões na sincronização (`personal_outlines`, `visits`, reuniões, `talk_themes`, `schedule_events`) + download completo guiado ("Baixar tudo agora" e oferta automática no primeiro login do aparelho).
- [x] Etapa C (offline-first): limpeza segura do espelho local (preserva pendências), medidor de espaço no aparelho e lista de pendências com "tentar de novo" por item. Versão 4.2.7/versionCode 17.
- [x] Relatórios executivos: dia e horário de Pioneiros e Anciãos/Servos iguais à aba "Reuniões e Discursos", "A combinar" quando não definido, checklist completo na exportação. Versão 4.2.8/versionCode 18.
- [ ] (adiada) Etapa B: sincronizar anexos (fotos/vídeos) com a nuvem.
- [x] Balão bíblico: apresentar texto primeiro com controles expansíveis e manter a escala da letra igual entre esboços e Tela Cheia; arraste livre corrigido e conferido em tela pequena.
- [x] 4.2.13: vídeo/foto gravados em pedaços no app Android (corrige "Não foi possível adicionar o anexo"), vídeo abre no player nativo, zoom nas fotos, tópicos recolhíveis nos esboços.
- [ ] (usuário) Instalar a 4.2.13 no celular e conferir anexar vídeo MP4, zoom e tópicos.
- [x] 4.2.14: barra compacta restaurada a duas linhas roláveis; aprovada na Play Store e anunciada aos aparelhos (LATEST_APP_VERSION).
- [x] Dashboard: cartão "Reuniões da semana" com títulos por campo; Pioneiros e Anciãos e Servos pelo "Dia e Horário (definido pelo Superintendente)", também no cronograma Hoje/Amanhã.
- [x] Etapa 5 / Rodada 0: balão bíblico instantâneo (capítulos em memória, leitura antecipada, Bíblia preparada após o login).
- [ ] Etapa 5 / Rodada A: dividir o Painel em peças separadas (aguarda o usuário testar a Rodada 0).
- [ ] Etapa 5 / Rodada B: dividir os Esboços pessoais em peças separadas (após a Rodada A).
- [x] Esboços premium — Rodada 1: botão "Detalhes" somente leitura na Consideração de Campo (modo esboço e telas cheias).
- [x] Esboços premium — Rodada 2: botão "+ Novo" com menu, busca larga, pastas em pílulas, cartões mais legíveis.
- [x] Esboços premium — Rodada 3: Biblioteca x Modo Foco (lista separada do esboço) e leitura tipo folha impressa.
- [ ] (opcional, após aprovação no uso) Rodada 4: recolher campos da Consideração de Campo em "Editar detalhes".

- [x] Recolher/expandir rodada 1: cartões do "Resumo do dia" da esposa e anciãos (individual + recolher tudo).
- [x] Recolher/expandir rodada 2a: cartões das abas Estudos, Campo, Refeições, Transporte e Checklist do painel por código.
- [ ] Recolher/expandir rodada 2b: abas Reuniões e Discursos, Checklist, Cronograma e Comunicação do casal do superintendente.
- [x] Offline premium: dados guardados 30 dias, selo de idade, aviso de vencimento do PIN.
- [x] Offline premium: lista "Não enviados" (recusas do servidor após 5 tentativas), tentar de novo/descartar no Perfil.
- [x] Offline premium: todas as telas do menu lateral constam na pré-carga sem internet.
- [x] Offline premium: alteração/exclusão aparece na tela na hora quando vai para a fila.
- [ ] (usuário) Gerar novo APK e testar sem internet no celular.
- [x] Cronômetro: corrigir alerta que some, alvo que corta tempo, cronômetro esquecido ligado, "não lembrar" permanente.
- [x] Alerta de esquecimento: tempo escolhido em destaque + "Começar do zero / Descontar tempo decorrido".
- [x] Rascunho dos Esboços pessoais: gravação automática no aparelho + recuperar/descartar.
- [x] Rascunho Reuniões e Discursos: horário do rascunho e tradução.
- [x] Reuniões e Discursos: destacar cada campo pendente; aviso no modo edição quando a soma dos tópicos difere do tempo do cronômetro.
- [x] Controle de tempo por tópico: minutos no modo edição, selos "até HH:MM", concluir tópico e atraso/adiantamento.
- [x] Som opcional nos avisos do cronômetro.

## Modelos e Itinerário (26/10)
- [x] Etapa 1 — Pílulas de seções e dias nos modelos (Segunda opcional)
- [x] Etapa 2 — Semanas de pioneiro/livre no Itinerário
- [ ] Etapa 3 — Aba única "Modelos" e Pacotes da visita (aguardando mockup aprovado)
