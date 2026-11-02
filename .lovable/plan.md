# Plano: nome da esposa, marcação de livros por dia e leitor da Bíblia melhorado

## 1. Nome da esposa

No card "Acesso da esposa" em Meu Perfil entra um campo **Nome da esposa**. A área de acesso dela passa a mostrar "Olá, Maria".

```text
┌──────────────────────────────┐
│ 🔑 Acesso da esposa           │
│ Nome da esposa               │
│ [ Maria                    ] │
│ Código                        │
│ [ ABC123 ] [Gerar] [Copiar]  │
│            [   Salvar   ]    │
└──────────────────────────────┘

Área da esposa:
┌──────────────────────────────┐
│ Olá, Maria 👋                 │
│ Visita: Cong. Central        │
└──────────────────────────────┘
```

**Ponto de atenção:** hoje o servidor não tem onde guardar esse nome. Para que ele chegue ao celular dela, é preciso **um campo novo e opcional** no perfil do superintendente. Isso não altera nem apaga nenhum dado e não muda as regras de acesso. Esse campo só é lido no momento em que ela entra com o código. Como a regra fixa do projeto é "não mexer no banco de dados", **aprovar este plano autoriza essa única adição**. Se você preferir não autorizar, a alternativa é ela digitar o próprio nome no celular dela, e o nome fica salvo só ali.

## 2. Leitura por dia: marcar os livros já escolhidos

Na lista de livros do plano "Dias", cada livro que já foi escolhido para algum dia ganha uma pequena etiqueta com o dia.

```text
┌──────────────────────────────┐
│ Escolher livro — Quarta      │
│ Gênesis            [Seg]     │
│ Êxodo              [Seg]     │
│ Salmos             [Qua] ✓   │
│ Provérbios         [Sex]     │
│ Isaías                       │
│ Mateus         [Ter][Sáb]    │
└──────────────────────────────┘
```

- Mostra a abreviação do dia em uma etiqueta cinza. O dia que você está editando aparece na cor de destaque.
- Funciona só como aviso: o mesmo livro continua podendo ser escolhido para mais de um dia.

## 3. Leitor da Bíblia melhorado

**Recomendação:** manter e melhorar o leitor atual em vez de trocar por um leitor EPUB pronto. Leitores prontos mostram o EPUB como "páginas". Com isso, perderíamos os links de versículos, os pontos altos, as marcações de leitura e as notas, que dependem do texto separado por versículo. Melhorando o leitor atual, tudo continua funcionando e só a TNM do seu arquivo é usada.

```text
┌──────────────────────────────┐
│ ‹  Salmos 23        Aa  🔊   │
├──────────────────────────────┤
│ 1 Jeová é o meu Pastor...    │
│ 2 Ele me faz deitar...       │
│                              │
├─ Aparência (folha de baixo) ─┤
│ Tamanho   [A-]  ━━●━━  [A+]  │
│ Fundo  (○Branco)(●Sépia)     │
│        (○Cinza)(○Noite)      │
│ Fonte  [Serifa][Sem serifa]  │
│        [Leitura fácil]       │
│ Brilho  ☀ ━━━━●━━ ☀          │
│ Espaço entre linhas ━●━━     │
└──────────────────────────────┘

Leitura em voz alta:
┌──────────────────────────────┐
│  ⏮   ▶ Ouvir   ⏭   1.0x      │
│  Versículo 2 destacado        │
└──────────────────────────────┘
```

O que é possível fazer:

- **Tamanho da letra:** usa a escala que já existe, com controle deslizante e botões A-/A+.
- **Cor de fundo:** branco, sépia, cinza e noite, usando os temas atuais.
- **Fonte:** três opções de fonte já incluídas no app, que funcionam sem internet.
- **Brilho:** muda o brilho real da tela só enquanto o leitor está aberto e volta ao normal ao sair. Isso precisa de um componente nativo novo no Android. No computador, o efeito é feito escurecendo a tela.
- **Ouvir em áudio:** usa a voz em português do próprio celular, funciona sem internet e destaca o versículo que está sendo lido. Tem botões de tocar/pausar, versículo anterior/próximo e velocidade. Também precisa de um componente nativo novo no Android, porque a voz do navegador não funciona bem dentro do app.
- Todas essas preferências ficam salvas só no seu aparelho.

## Detalhes técnicos

- Nome da esposa: migração `alter table profiles add column wife_display_name text` (anulável, sem mudança de RLS). O valor é salvo em `_app.perfil.tsx`, devolvido pelo login de convidado em `guest.functions.ts` e mostrado em `visitante.painel.tsx`, com cache local para uso offline. Textos novos em pt/en/es.
- Dias: monta um mapa `livro → dias[]` a partir de `rdata.weekday` no seletor de livros do WeekdayCard. A lógica é pura, com teste.
- Leitor: ampliar `bible-view-settings.ts` com `fontFamily`, `lineHeight`, `brightness` e as cores sépia/cinza (valores padrão para configurações antigas) e aplicar no `CleanReader.tsx`. Plugins novos: `@capacitor-community/text-to-speech` e `@capacitor-community/screen-brightness`, depois `cap sync`. O APK precisará ser gerado de novo. A versão não sobe.
- Validação com `bunx tsgo --noEmit` e `bunx vitest run`.
