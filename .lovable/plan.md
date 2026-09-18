# Desbloqueio por biometria (e pelo bloqueio do próprio celular)

Hoje o acesso sem internet já funciona com um PIN de 6 dígitos criado dentro do app. Esta etapa acrescenta a digital/rosto e, quando o aparelho permitir, o próprio PIN/padrão de desbloqueio do celular — sem mexer no login com usuário e senha.

## Respondendo à sua pergunta

Sim, dá para usar o desbloqueio do próprio aparelho (digital, rosto, PIN/padrão do sistema) em vez de digitar o PIN do app. O que **não** é possível é ler o PIN do celular: o Android nunca entrega esse número a nenhum aplicativo. O que o sistema faz é confirmar "esta pessoa é o dono" e, com isso, liberar uma chave guardada em área protegida do aparelho.

Consequência prática, e é importante: essa chave só existe dentro do celular. Se o app for reinstalado, o aparelho trocado ou a tela de bloqueio removida, essa chave se perde. Por isso o PIN de 6 dígitos do app continua existindo como caminho garantido de recuperação — ele é o único que consegue reabrir o cofre em qualquer situação.

No navegador (uso pelo site) a biometria não fica disponível; lá continua só o PIN.

## Como vai ficar para quem usa

1. Ao criar o PIN, aparece a opção "Usar digital/rosto neste aparelho".
2. Na tela de entrada, quem ativou vê o botão "Entrar com digital" em destaque; um toque abre o app, sem internet.
3. Se a digital falhar ou o dedo estiver molhado, o campo do PIN continua logo abaixo.
4. Em "Meu perfil" é possível ligar e desligar a biometria a qualquer momento; remover o PIN remove tudo junto.
5. Se o aparelho não tiver digital cadastrada, o botão simplesmente não aparece.

## Detalhes técnicos

- Plugin nativo de biometria compatível com Capacitor 8 (avaliar `@aparajita/capacitor-biometric-auth`; fallback `capacitor-native-biometric`). Configurar `allowDeviceCredential` para aceitar PIN/padrão do sistema quando não houver digital cadastrada.
- `src/lib/offline-credentials.ts` ganha envelope duplo: a chave AES-GCM do cofre (`contentKey` aleatória) passa a ser embrulhada duas vezes — uma pela chave derivada do PIN (PBKDF2, como hoje) e outra por uma chave aleatória guardada no armazenamento seguro nativo. Registro versionado `v: 2`; `v: 1` existente é migrado no primeiro desbloqueio por PIN, sem quebrar quem já criou PIN.
- Novo `src/lib/biometric-unlock.ts`: `isBiometricAvailable()`, `enableBiometric(contentKey)`, `unlockWithBiometric()`, `disableBiometric()`. Detecta plataforma via `Capacitor.isNativePlatform()`; na web retorna indisponível.
- `PinUnlockPanel.tsx`: botão de biometria acima do campo de PIN, com o mesmo caminho de restauração de sessão/perfil já existente; qualquer falha cai silenciosamente no PIN.
- `PinSetupDialog.tsx` e `OfflinePinCard.tsx`: alternância para ativar/desativar biometria; `clearVault()` também apaga a chave nativa.
- Novas chaves `offlinePin.biometric*` em pt/en/es.
- Sem migração de banco, sem mudança de RLS, sem alteração no login online, em esboços ou textos bíblicos.

## Riscos

| Risco | Contenção |
| --- | --- |
| Plugin incompatível com Capacitor 8 | Verificar na instalação; se falhar, usar o alternativo. Biometria é sempre opcional — o app funciona igual sem ela |
| Chave nativa perdida (reinstalação, troca de aparelho) | PIN de 6 dígitos continua sendo o caminho garantido |
| Regressão em quem já tem PIN | Registro versionado com migração transparente no primeiro desbloqueio |
| Biometria não disponível na web | Botão só aparece em aparelho nativo com digital cadastrada |

## Entrega

1. Envelope duplo no cofre + migração do formato atual.
2. Plugin nativo, camada `biometric-unlock.ts` e botão na tela de entrada.
3. Ativar/desativar em "Meu perfil" + traduções + verificação de tipos e build.

Depois disso será preciso gerar um novo APK/AAB, já que a biometria depende de código nativo.
