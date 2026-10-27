# Esboços Pessoais: campo de texto mais limpo

## (01) Qual forma é melhor: "Modo edição" ou "Anotações"?
O campo de digitação é o mesmo nos dois lugares. Ele usa o mesmo editor, a mesma barra "[Aa] Ferramentas", o mesmo botão 📖 e o mesmo salvamento. As diferenças são estas:
- **Modo edição (esboços):** tem a escolha Edição/Esboço. Assim você escreve e depois lê o esboço com o cronômetro.
- **Anotações:** abre direto para escrever, sem a escolha de modo, porque anotação não tem cronômetro.

**Recomendação:** manter o mesmo campo nos dois. Para quem usa, isso é o mais vantajoso, porque aprende uma vez e usa igual em todo lugar. Pelo padrão iOS e One UI, um campo de escrita deve ser igual em toda a tela. O que muda de um lugar para o outro são só os botões ao redor, e isso já está assim hoje. Não vou alterar nada aqui.

## (02) Tirar a palavra "Conteúdo"
Antes:
```text
| < Esboços [Edição|Esboço] ⇕  ⋯ [💾] |
+-------------------------------------+
| Conteúdo                            |  <- linha só com o título
|-------------------------------------|
| [Aa Ferramentas ▾]                  |
| Escreva suas considerações...       |
```
Depois:
```text
| < Esboços [Edição|Esboço] ⇕  ⋯ [💾] |
+-------------------------------------+
| [Aa Ferramentas ▾]                  |
| Escreva aqui...       (cinza claro) |  <- some quando você digita
|                                     |
|  (cerca de 1 linha a mais de texto) |
|                                 (📖)|
```
- A linha "Conteúdo" sai do modo edição e das Anotações.
- Dentro do campo vazio aparece em cinza claro "Escreva aqui…". Esse texto não é salvo junto com a anotação. Ele some assim que você começa a digitar e volta se o campo ficar vazio. É assim que funcionam as Notas do iPhone e do Samsung.
- O modo esboço (leitura) não muda.
- Nada muda no que já está salvo. Os esboços existentes continuam iguais.

## Detalhes técnicos
- `_app.consideracoes-campo.tsx`: remove o bloco `<Label>{fields.content}</Label>` do ramo `mode !== "outline"`. Para leitores de tela, o editor recebe `aria-label` com o mesmo texto, se o RichNoteEditor aceitar; senão, fica só o placeholder.
- i18n pt/en/es: `fieldConsiderations.fields.contentPh` passa a ser "Escreva aqui…", "Write here…" e "Escribe aquí…". A chave só é usada nessa tela.
- O placeholder já vem da extensão Placeholder do TipTap (só visual). Não precisa de código novo.
- Validação: `bunx tsgo --noEmit` e `bunx vitest run`.
