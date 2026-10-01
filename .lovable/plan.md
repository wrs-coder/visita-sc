# Investigar e corrigir a lentidão (telas e importação da Bíblia)

## Causas prováveis (a confirmar com medição)
1. **Animação entre telas espera a tela anterior sair** antes de mostrar a nova (modo "esperar"). Soma um atraso fixo em toda troca de tela, pior em celulares mais simples.
2. **Disputa pelo armazenamento do aparelho.** Desde a 4.2.7, cada resposta do servidor também é copiada para o banco local, e o cache das telas inteiro é regravado a cada segundo. Essas gravações disputam o mesmo armazenamento usado pela importação da Bíblia.
3. **Cache das telas maior.** Com mais tabelas no espelho e no cache, salvar e restaurar o cache inteiro ficou mais pesado.
4. **Importação da Bíblia com muitas pausas curtas.** As pausas que mantêm a tela respondendo deixam a importação mais longa quando há outras gravações acontecendo.

Ainda não está confirmado qual desses pesa mais. O primeiro passo é medir.

## Passos
1. **Medir antes de mudar:** tempo de troca de tela, tamanho do cache salvo e duração da importação do EPUB no preview com perfil de celular.
2. **Telas:** a nova tela aparece já, sem esperar a anterior sair, com animação mais curta. Sem animação quando o celular pede menos movimento.
3. **Gravações:** espaçar o salvamento do cache, de 1 s para cerca de 5 s, e agrupar as cópias para o banco local em lotes.
4. **Importação da Bíblia:** pausar o salvamento do cache e as cópias de fundo enquanto importa, e fazer pausas menos frequentes. Leitura e formato da Bíblia ficam iguais.
5. **Medir de novo** e comparar com o passo 1. Só manter o que melhorar de verdade.

## O que não muda
Banco/RLS, Bíblia importada e formato EPUB, login/PIN/biometria, sincronização 2x ao dia, fila offline.

## Detalhes técnicos
- `RouteTransition.tsx`: trocar `AnimatePresence mode="wait"` por animação só de entrada (sem exit) e com duração menor.
- `query-persister.ts`: `throttleTime` 1000 → ~5000. Também conferir o tamanho de `visita-sc-rq-cache`.
- `local-first.ts`/`local-write.ts`: juntar as gravações de espelho em lote (microtask/idle).
- `bible-notes-store.ts`/`epub-bible-parser.ts`: flag global "importando" que suspende o persister e o espelho. Fazer `yieldToUI` por tempo decorrido (~16 ms) em vez de contar iterações.
- Validar com os testes, `tsgo` e build. Exige nova versão do APK/AAB (4.3.0).
