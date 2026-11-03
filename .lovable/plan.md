# Corrigir aviso de "links diretos" do Play Console

## O que está acontecendo
O app diz ao Android que abre links de 3 endereços:
- visitasc.com.br — funciona (o arquivo de associação responde direto)
- www.visitasc.com.br — falha
- visita-sc.lovable.app — falha

Os dois últimos redirecionam para visitasc.com.br, e o Android não aceita redirecionamento nessa verificação. São exatamente os "2 links" do aviso.

## É urgente?
Não. Nada quebra: os convites dos Grandes Eventos já usam `https://visitasc.com.br/c/...`, que funciona. O aviso só diz que links com "www" ou ".lovable.app" abrem no navegador em vez do app. Pode entrar na próxima versão.

## Correção proposta
Tirar os dois endereços que redirecionam da lista do app, mantendo só visitasc.com.br. Assim o aviso some e o comportamento dos links atuais não muda.

Não vou mexer no redirecionamento do site (ele mantém tudo apontando para o endereço principal).

## Detalhes técnicos
- `android/app/src/main/AndroidManifest.xml`: remover `<data android:host>` de `visita-sc.lovable.app` e `www.visitasc.com.br` do intent-filter com `autoVerify`.
- `public/.well-known/assetlinks.json` fica igual (já tem as duas impressões digitais).
- Sem bump de versão agora; entra no próximo AAB. Depois de publicar, em Play Console > Links diretos, os erros somem após a nova versão.
