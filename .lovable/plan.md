## Verificação dos plugins do celular (APK/AAB)

Resultado: nenhum plugin novo precisa ser instalado. Todos os recursos usados pelo app já estão instalados e registrados no projeto Android.

| Recurso no app | Plugin | Situação |
|---|---|---|
| Base do app | core / android | instalado |
| Botão voltar, abrir links | app / browser | instalado |
| Anexos, backup, exportar Word/PDF | filesystem / share / file-opener | instalado |
| Lembretes (avisos, 2º aviso, resumo diário, "Adiar 10 min") | local-notifications | instalado |
| Modo imersivo | status-bar | instalado |
| PIN e biometria | biometric-auth / secure-storage | instalado |
| Importar backup do JW Library | arquivo sql-wasm na pasta do app (não é plugin) | presente |

As permissões de notificação e biometria já estão no manifesto Android.

### O que fazer para levar as mudanças ao APK/AAB
Rodar no seu computador, na ordem:
1. `git pull` (pegar a versão mais recente)
2. `npm install` (garante os plugins da lista acima)
3. o script de empacotamento Android do projeto (reconstrói as telas e confere se não estão desatualizadas) e depois `npx cap sync android`
4. Gerar o AAB/APK no Android Studio

Opcional, se aprovar: subir o número da versão e ligar o aviso "Novidades" antes de gerar o AAB para a Play Store.
