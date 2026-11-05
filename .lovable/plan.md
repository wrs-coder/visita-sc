# Correção: esboços e pastas não atualizam entre aparelhos

## O que encontrei (confirmado no código)

1. **"Receber da nuvem" só atualiza esboços que o aparelho já conhece pelo "número da nuvem".** Se o esboço foi criado no aparelho A, o aparelho B não tem esse número. Resultado: "ainda não está na nuvem" ou nada acontece.
2. **"Receber" da pasta não traz esboços novos.** Ela só passa pelos esboços que já existem dentro da pasta no aparelho B. Esboços criados ou movidos no aparelho A nunca chegam.
3. **Duplicatas sem ligação.** Quando o mesmo esboço existe nos dois aparelhos sem o mesmo número da nuvem, "Enviar" no A atualiza uma cópia na nuvem, e o B continua ligado a outra (ou a nenhuma).
4. **A lista da nuvem pode vir da cópia guardada no celular.** A leitura da lista de esboços passa pela cópia local (do trabalho de modo offline). Assim, ao tocar em Sincronizar no B, ele pode ler a lista antiga guardada em vez da nuvem atual.
5. **Receber não acompanha mudanças de pasta ou título** feitas no outro aparelho.

## O que vou corrigir

- **Receber (esboço):** sempre busca direto na nuvem, nunca na cópia guardada. Se o esboço não tiver número da nuvem, procura a cópia da nuvem pelo mesmo título e pasta, liga as duas e atualiza. Também atualiza título e pasta.
- **Receber (pasta):** lê a lista atual da nuvem para aquela pasta e as subpastas. Atualiza os esboços que já existem, **cria os que faltam** e cria as subpastas que faltam. Antes de substituir alterações que você ainda não enviou, o app continua perguntando.
- **Enviar (esboço ou pasta):** antes de criar uma cópia nova na nuvem, verifica se já existe lá um esboço com o mesmo título e pasta, e atualiza esse em vez de duplicar.
- **Botão Sincronizar geral:** a lista de esboços da nuvem passa a ser lida sempre da nuvem quando você toca nele. O modo sem internet continua usando o que está no celular.
- **Mensagens claras:** por exemplo "3 atualizados · 2 novos · 1 com erro".

Sem mudanças no banco de dados, no login ou na versão. O resto do app continua igual.

## Como vou testar

- Testes automáticos com dois "aparelhos" simulados na mesma conta: enviar no A, receber no B (esboço novo, esboço editado, esboço sem ligação, pasta com subpasta).
- Teste confirmando que o Receber não usa a cópia guardada.
- `bunx tsgo --noEmit` e `bunx vitest run`.

## Detalhes técnicos

- `pullOutlineFromCloud` / nova `listCloudOutlinesInPath` (sem `readCacheMiddleware`) em `personal-outlines.functions.ts`; `listCloudOutlineTree` ganha variante sem cache para `syncNow` em `use-outlines-sync.ts`.
- `OutlinesWorkspace.tsx`: `pullOneNote` relaciona por `cloud_id` → (note_type, folder_path, título); `pullFolderAction` faz o merge da lista da nuvem usando `ensureFolderPath`; `pushOneNote` relaciona antes de inserir.
- Lógica de relacionamento em função pura com testes (vitest).

---

# Pedido 01 — Regras no instructions.md

Adicionar ao instructions.md (sem apagar nem mudar as regras atuais):

- **Nova seção "Como o aplicativo funciona"**: celular primeiro (tudo lido do aparelho, servidor só ao tocar em Sincronizar, após salvar ou sem cópia); envio/recebimento por esboço e por pasta; acesso da esposa só no aparelho; PIN só após "Sair"; Bíblia só do EPUB TNM do usuário.
- **Nova seção "Código protegido (trava)"**: lista dos arquivos centrais do modo sem internet, login offline, sincronização e leitor do EPUB. Regra: só podem ser alterados com pedido explícito do Wanderson citando a função; a IA deve avisar antes de tocar neles. Um teste automático confere que essa lista continua existindo no instructions.md.
- **Regra obrigatória da Ajuda**: toda mudança de tela ou função nova que afete o uso deve atualizar a "Ajuda" do app no mesmo trabalho; item incluído no checklist final (seção 11).

Observação sincera: a "trava" é uma regra que eu (a IA) sou obrigada a seguir e checar; tecnicamente não existe cadeado que impeça edição de código.

# Pedido 02 — Palavras coladas na Bíblia (ex.: Provérbios 22:11, 16)

**Causa provável (confirmada no código, falta confirmar com seu arquivo):** Provérbios é poesia. No EPUB, cada linha do versículo fica em um bloco separado. Ao montar o versículo, o app junta o texto dos blocos sem colocar espaço entre eles, então a última palavra de uma linha gruda na primeira da próxima.

**Correção:**
- Ao ler o EPUB, colocar espaço (ou quebra de linha) toda vez que muda de linha/bloco, seguindo a formatação original.
- Mostrar a poesia em linhas, como no arquivo original, só na aba Bíblia (esboços continuam iguais).
- Como o texto já importado ficou gravado colado, o app vai **reprocessar a Bíblia uma vez** a partir do EPUB guardado no aparelho. Se o arquivo original não estiver mais guardado, aparece um aviso pedindo para importar o EPUB de novo. Pontos altos e marcações são mantidos.

```text
┌──────────────────────────┐
│ ‹ Provérbios 22          │
│                          │
│ 11 Quem ama a pureza de  │
│    coração e fala com    │
│    graça terá o rei como │
│    amigo.                │
│ 16 Quem defrauda o pobre │
│    ...                   │
└──────────────────────────┘
```

## Testes extras
- Teste com um trecho de EPUB em linhas de poesia: palavras não podem colar.
- Teste da lista de código protegido e da regra da Ajuda no instructions.md.
- Itens novos também entram na Ajuda do app.
