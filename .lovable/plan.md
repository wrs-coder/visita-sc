# Diagnóstico de acesso ao visita-sc.lovable.app

## O que eu verifiquei agora

Depois que você desativou o endereço principal, testei novamente os três endereços:

- `visitasc.com.br` → responde normalmente (200)
- `www.visitasc.com.br` → responde diretamente (200)
- `visita-sc.lovable.app` → responde diretamente (200, abaixo de 1 segundo)
- `visita-sc.lovable.app/manifest.webmanifest` e `/favicon.ico` → respondem normalmente
- IPv4 e IPv6 → ambos respondem normalmente
- Certificado HTTPS → válido

O redirecionamento anterior realmente foi removido. Neste momento, o servidor e o domínio estão
saudáveis. A mensagem “demorou muito para responder” está sendo provocada no caminho entre o seu
aparelho e esse domínio — as causas mais prováveis são cache DNS do celular/roteador, DNS privado,
VPN, bloqueador de anúncios ou filtro da operadora/rede Wi-Fi.

## Como confirmar a causa sem alterar o aplicativo

1. No mesmo celular, abrir `https://visita-sc.lovable.app` usando os dados móveis, com o Wi-Fi
   desligado.
2. Depois testar novamente no Wi-Fi. Se funcionar apenas nos dados móveis, a causa está no DNS ou
   filtro do roteador/rede Wi-Fi.
3. Se falhar nas duas redes, desativar temporariamente VPN, DNS privado e bloqueadores, e testar em
   uma janela anônima.
4. Reiniciar o celular limpa conexões e caches de rede presos. No Android, também é possível limpar
   apenas o cache do navegador, sem apagar senhas ou dados do aplicativo.

## O que proponho

1. **Manter os três endereços independentes**, como estão agora, para a reserva funcionar de verdade.
2. **Reduzir a espera antes de trocar de endereço** no aplicativo, para desistir mais rápido de uma
   conexão bloqueada ou lenta.
3. **Tornar a troca automática mais robusta**, avançando para o próximo endereço também quando a
   tentativa exceder o limite de tempo — não apenas quando o navegador devolve uma falha imediata.
4. **Validar em APK de teste** alternando entre Wi-Fi e dados móveis antes de gerar o AAB definitivo.

## Detalhes técnicos

- `src/lib/api-origin.ts`: reduzir `PROBE_TIMEOUT_MS` de 4000 para 2500 ms e manter a preferência
  pela última origem funcional.
- `src/start.ts`: aplicar limite de tempo real às chamadas do aplicativo; ao expirar ou ocorrer erro
  de rede, cancelar a tentativa e repetir uma vez na próxima origem.
- Não considerar respostas HTTP normais do aplicativo como falha; somente indisponibilidade de rede,
  timeout ou erro de conexão deve acionar a troca.
- Nada muda no banco de dados, na sessão do usuário, no modo offline, no cronômetro ou nos PDFs.
