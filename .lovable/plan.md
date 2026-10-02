# Visita SC no relógio (Wear OS) — Fase 1

## Objetivo

Levar ao relógio Wear OS um conjunto de funções **somente leitura + cronômetro**, sem alterar o comportamento do app no celular:

1. **Cronômetro do esboço** no pulso (iniciar/pausar/zerar, com alerta de tempo).
2. **Cronograma do dia ("Hoje")** com lembretes de horários.
3. **Próximas designações** de campo e reuniões.
4. **Resumo da Semana / Semana atual** em formato resumido (cartões de leitura).
5. **Dashboard resumido** (indicadores principais da visita).

## Arquitetura proposta

O app atual é uma casca web (Capacitor) e o Wear OS não roda WebView. Por isso:

```text
┌─────────────────────┐   Wearable Data Layer   ┌──────────────────────┐
│  App no celular      │ ◄────────────────────► │  Módulo wear (nativo) │
│  (Capacitor, atual)  │   mensagens + dados    │  Kotlin + Compose     │
│  continua o "cérebro"│                        │  telas próprias,      │
│  dados, login, sync  │                        │  somente leitura      │
└─────────────────────┘                        └──────────────────────┘
```

- **Novo módulo Gradle `:wear`** dentro da pasta `android/`, com telas nativas em Kotlin (Compose para Wear OS). Nada do código web atual é reaproveitado no relógio.
- **Ponte de dados**: o app do celular envia ao relógio, via Wearable Data Layer API, um pacote resumido (cronograma do dia, próximas designações, resumo da semana, indicadores do dashboard). O relógio **não acessa** o banco nem a internet diretamente.
- **Cronômetro**: roda no relógio de forma independente (não precisa do celular por perto depois de iniciado); estado sincronizado quando os dois estão conectados.
- **Lembretes**: notificações locais no relógio geradas a partir dos horários recebidos do celular.
- **Distribuição**: o módulo wear entra no mesmo AAB; a Play Store passa a marcar o app como compatível com relógios. Sem novo app nem nova listagem.

## Etapas

1. **Base do módulo wear**: criar `:wear` no Gradle, tela inicial "Olá" em Compose, empacotar no AAB e confirmar que o app do celular continua idêntico (build + instalação de teste).
2. **Ponte de dados**: plugin/serviço no app do celular que monta e envia o pacote resumido (a partir dos dados locais já existentes) sempre que houver sync ou mudança; relógio recebe e guarda localmente.
3. **Telas do relógio**: Hoje (cronograma), Próximas designações, Resumo da semana, Dashboard resumido — todas somente leitura, com "Abrir no telefone" onde fizer sentido.
4. **Cronômetro do esboço**: tela de cronômetro no relógio com vibração de alerta; sincronização de estado com o celular quando conectado.
5. **Lembretes**: notificações locais no relógio nos horários do cronograma.
6. **Validação e empacotamento**: testar AAB completo (celular + wear), assinatura, e subir versão nova.

## Riscos e mitigações

| Risco | Nível | Mitigação |
|---|---|---|
| App do celular quebrar | Baixo | Módulo wear é separado; celular só ganha a ponte de dados. Cada etapa termina com build e teste do AAB do celular |
| Build/empacotamento falhar | Médio | Etapa 1 valida o empacotamento antes de qualquer funcionalidade; assinatura permanece a mesma |
| Relógio sem dados (celular longe/desconectado) | Esperado | Relógio guarda o último pacote recebido e mostra data da última atualização |
| Consumo de bateria do relógio | Médio | Somente leitura + cronômetro local; sem sincronização contínua |
| Custo de manutenção | Alto | Telas nativas novas precisam evoluir junto; por isso a Fase 1 é deliberadamente pequena e somente leitura |

## Fora de escopo (Fase 1)

- Edição de qualquer dado no relógio
- Esboços, anexos, Bíblia, relatórios em PDF no relógio
- Login direto no relógio (depende do celular pareado)
- Banco/RLS, Bíblia offline e fluxo login/PIN/biometria: **intocados**

## Detalhes técnicos

- `android/settings.gradle`: incluir `:wear`; novo módulo com `com.android.application` wear, `minSdk 30` (Wear OS 3+), Compose for Wear OS.
- Dependências: `androidx.wear:wear-remote-interactions`, `com.google.android.gms:play-services-wearable` no app do celular para a ponte.
- Pacote resumido trocado como DataMap/MessageClient em caminho próprio (`/visitasc/summary`), versionado (`v1`) para evolução futura.
- Versão do app sobe apenas quando a Fase 1 estiver completa e validada.
- O trabalho nativo (Kotlin/Gradle) é feito nos arquivos do projeto; a compilação e teste em emulador/dispositivo Wear acontecem no seu computador (o sandbox não tem SDK Android), como já ocorre com o APK/AAB.

## Validação

- Typecheck e testes do app web continuam passando (nada muda no `src/` além da ponte de dados, isolada).
- AAB do celular gerado e instalado normalmente antes de cada etapa seguinte.
- Checklist final: app do celular idêntico ao atual; relógio mostra Hoje, designações, resumo, dashboard e cronômetro com dados do celular.
