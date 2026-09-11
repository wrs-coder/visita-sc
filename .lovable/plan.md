# Por que visita-sc.lovable.app "demora para responder"

## O que eu verifiquei agora

Testei os três endereços várias vezes:

- `visitasc.com.br` → responde normalmente (200, entre 0,9s e 3,5s)
- `www.visitasc.com.br` → **redireciona** para `visitasc.com.br`
- `visita-sc.lovable.app` → **redireciona** para `visitasc.com.br`

Ou seja: o endereço `visita-sc.lovable.app` não caiu e não está quebrado. Ele foi configurado como
"endereço secundário" e por isso manda todo o tráfego para `visitasc.com.br`, que hoje é o endereço
principal do projeto. A mensagem que você viu no navegador foi uma lentidão momentânea (ou cache do
próprio celular/navegador), não uma queda: nas minhas medições tudo respondeu.

## O problema real (mais importante que a mensagem)

Isso significa que **os três endereços de reserva do aplicativo apontam, na prática, para o mesmo
lugar**. Se `visitasc.com.br` ficar fora do ar, os outros dois também deixam de funcionar, porque
apenas repassam a chamada para ele. A proteção contra queda que montamos na versão 4.1.0 fica sem
efeito.

## O que proponho

1. **Desativar o "endereço principal"** nas configurações do projeto (Configurações → Domínios →
   menu de três pontos no domínio principal → "Remover como principal"). Sem endereço principal,
   cada um dos três passa a servir o aplicativo por conta própria — e aí a reserva funciona de
   verdade. Esta etapa é feita por você no painel; é um clique e não afeta o app instalado.
2. **Ajustar a sondagem de endereços do aplicativo** para não aceitar um endereço que apenas
   redireciona para outro. Hoje ele considera "funcionando" qualquer resposta boa, inclusive a
   que veio de um redirecionamento — o que faz os três parecerem saudáveis mesmo apontando para
   um só servidor.
3. **Reduzir a espera antes de trocar de endereço**, para o aplicativo desistir mais rápido de um
   endereço lento em vez de parecer travado.

Se você preferir manter `visitasc.com.br` como endereço principal do site (por questão de
divulgação/SEO), fazemos só os itens 2 e 3 — mas nesse caso a reserva continuará limitada, já que
todos os caminhos terminam no mesmo servidor.

## Detalhes técnicos

- `src/lib/api-origin.ts`: a função `probe()` passa a usar `redirect: "manual"` e só aceita
  `res.ok` sem redirecionamento; `PROBE_TIMEOUT_MS` cai de 4000 para 2500 ms.
- `resolveBestApiOrigin()` ganha uma segunda passada permissiva: se nenhum endereço passar no
  critério estrito, aceita o primeiro que responda mesmo via redirecionamento, para nunca deixar o
  app sem origem.
- Nada muda no banco de dados, na sessão do usuário, no modo offline, no cronômetro ou nos PDFs.
