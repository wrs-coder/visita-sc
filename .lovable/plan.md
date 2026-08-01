## Diagnóstico confirmado

O fingerprint `2C:EA:E9:...:61:CA` é somente a identificação pública do certificado; ele não contém a chave privada e não permite recriar o `.keystore`. O snippet `CLW4ESFER6NGUAAAAAAAAAAAAA` também não é uma keystore nem substitui as senhas de assinatura. Portanto, criar `android/keystore.properties` com esses dois valores não corrigiria a rejeição e poderia expor informação sensível.

Há ainda uma inconsistência nas respostas: foi indicado que a chave não está disponível, embora também tenha sido selecionado “somente no computador”. O caminho seguro será verificar localmente se existe algum `.keystore`/`.jks` capaz de produzir o fingerprint esperado antes de gerar outro certificado.

## Plano seguro

1. **Manter o App ID** `app.lovable.visitasc` e não alterar contas, banco ou dados dos usuários.
2. **Não versionar segredos:** manter `android/keystore.properties`, `.keystore` e `.jks` cobertos pelo `.gitignore`; não inserir senhas ou o snippet no código.
3. **Preparar a configuração local:** deixar um modelo exato de `keystore.properties` para apontar a um arquivo de chave real, com `storeFile`, `storePassword`, `keyAlias` e `keyPassword`.
4. **Verificar qualquer chave encontrada no computador:** usar `keytool` para extrair o SHA-256 e só aceitar a chave se ele for exatamente `2C:EA:E9:A9:3E:7E:70:29:DE:95:94:BB:9C:20:69:EC:5B:9D:44:95:0B:83:51:B6:6B:8C:16:0C:67:A9:61:CA`.
5. **Se nenhuma chave corresponder:** gerar uma nova chave de upload e solicitar na Play Console a redefinição da chave de upload. Como o Play App Signing está ativo, isso preserva o Package Name, a conta do app e futuras atualizações.
6. **Gerar e validar o AAB:** executar o build release e `npm run android:verify:signature`; somente enviar quando o SHA-256 coincidir com o certificado de upload registrado após a recuperação/redefinição.
7. **Atualizar a documentação:** esclarecer que fingerprint/snippet não são material de assinatura e documentar os dois fluxos — recuperação da chave original ou redefinição segura da chave de upload.

## Limite de segurança

Não criarei uma keystore falsa nem colocarei senhas em arquivo versionado. Sem a chave privada original, a correção legítima é redefinir a chave de upload na Play Console; isso não quebra o aplicativo porque a chave final de distribuição continua gerenciada pelo Google Play.