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

## 3. Leitor da Bíblia melhorado (só na aba Bíblia)

Os recursos novos valem somente nas leituras da aba **Bíblia**: Pessoal, Família, Reunião e o leitor de capítulo. A janela de versículo que abre nos Esboços, nas notas e nos links continua **exatamente como está**.

Vamos melhorar o leitor atual, e não trocar por um leitor EPUB pronto. Um leitor pronto quebraria os links, os pontos altos e as marcações de leitura.

**Topo reorganizado:** "Aa" e "🔊" ficam juntos em um único botão **Leitura**. "Concluído" continua no mesmo lugar. O "+" sozinho sai do topo e vira um botão com nome, **✎ Ponto alto**, embaixo.

```text
┌──────────────────────────────┐
│ ‹ Salmos 23  [Aa🔊] [✓ Concluído]│
├──────────────────────────────┤
│ 1 Jeová é o meu Pastor...    │
│ 2 Ele me faz deitar...       │
│                              │
│        [ ✎ Ponto alto ]      │ ← flutuante, acima da
└──────────────────────────────┘   barra do Android

Ao selecionar um trecho:
┌──────────────────────────────┐
│ [✎ Ponto alto] [Nota] [Copiar]│
└──────────────────────────────┘

Toque em [Aa🔊] → folha de baixo:
┌──────────────────────────────┐
│ ─── Leitura ───               │
│ 🔊 Ouvir capítulo       [ ▶ ] │
│ Tamanho   [A-]  ━━●━━  [A+]  │
│ Fundo (Branco)(●Sépia)       │
│       (Cinza)(Noite)         │
│ Fonte [Serifa][Sem serifa]   │
│       [Leitura fácil]        │
│ Brilho  ☀ ━━━━●━━            │
│ Espaço entre linhas ━●━━     │
└──────────────────────────────┘

Ouvindo (barra fixa embaixo):
┌──────────────────────────────┐
│ ⏮   ⏸   ⏭   1.0x   ✕        │
│ Versículo 2 destacado         │
└──────────────────────────────┘
```

- **Tamanho, fundo, fonte e espaço entre linhas** ficam salvos no aparelho e valem para todas as leituras da aba Bíblia.
- **Brilho:** muda só enquanto o leitor está aberto e volta ao normal quando você sai.
- **Ouvir:** usa a voz em português do próprio celular, funciona sem internet e destaca o versículo que está sendo lido.
- **Ponto alto:** com texto selecionado, salva o trecho. Sem seleção, salva o capítulo.
- Os recursos de brilho e voz precisam de 2 componentes nativos novos no Android, então o APK terá que ser gerado de novo. A versão não sobe.

## Detalhes técnicos

- Nome da esposa: migração `alter table profiles add column wife_display_name text`, anulável e sem mudança de RLS. O valor é salvo em `_app.perfil.tsx`, devolvido pelo login de convidado em `guest.functions.ts` e mostrado em `visitante.painel.tsx`, com cache local para uso offline. Textos em pt/en/es.
- Dias: mapa puro `livro → dias[]` a partir de `rdata.weekday`, usado no seletor de livros do WeekdayCard, com teste.
- Leitor: novo store separado `bible-reader-settings.ts` com tamanho, fundo, fonte, espaço entre linhas e brilho. O `bible-view-settings.ts` da janela de versículo não é alterado. O store é aplicado no `CleanReader.tsx` e nas leituras da aba Bíblia. O topo do CleanReader é reorganizado e ganha um botão flutuante de ponto alto com rótulo e uma barra de seleção. Plugins: `@capacitor-community/text-to-speech` e `@capacitor-community/screen-brightness`, depois `cap sync`.
- Validação com `bunx tsgo --noEmit` e `bunx vitest run`.
