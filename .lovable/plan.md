# Idioma do aparelho, aba Circuito mais limpa e versão pronta

## (01) Idioma padrão = idioma do aparelho

- Na primeira abertura, o app usa o idioma do celular: Português, Inglês ou Espanhol.
- Se o celular estiver em outro idioma (francês, por exemplo), o app abre em Português.
- Se você escolher um idioma no app, ele vale para sempre e a escolha automática deixa de valer.
- Enquanto você não escolher, o app segue o celular. Se você mudar o idioma do celular, o app muda junto na próxima abertura.

## (02) Ocultar o card "Circuito IBE-01 · defina em Meu perfil"

Concordo: o nome do circuito já aparece no título da aba. Para o superintendente, o card sai da tela. Para os anciãos nada muda: eles continuam vendo "Sua congregação".

```text
ANTES                              DEPOIS
┌───────────────────────────┐     ┌───────────────────────────┐
│ Circuito IBE-01      [📅] │     │ Circuito IBE-01      [📅] │
│ (Itinerário)(Congregações)│     │ (Itinerário)( Circuito )  │
│ ┌───────────────────────┐ │     │                           │
│ │ CIRCUITO              │ │     │ Semana 03–09 nov          │
│ │ IBE-01                │ │     │ Cong. Central · Visita    │
│ │ defina em Meu perfil  │ │     │ Semana 10–16 nov          │
│ └───────────────────────┘ │     │ ...                       │
│ Semana 03–09 nov          │     │                           │
└───────────────────────────┘     └───────────────────────────┘
```

## (03) A pílula "Congregações" passa a se chamar "Circuito", com duas pílulas internas

```text
┌───────────────────────────────┐
│ Circuito IBE-01          [📅] │
│ (Itinerário) ( Circuito )     │
│ ───────────────────────────── │
│ [Congregações] [Anciãos do circuito] │ <- pílulas menores
│                               │
│ Congregações · 4 ativas  [+ Nova] │
│ ┌───────────────────────────┐ │
│ │ Cong. Central             │ │
│ │ Cong. Norte               │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘

Ao tocar em "Anciãos do circuito":
┌───────────────────────────────┐
│ [Congregações] [Anciãos do circuito] │
│ Anciãos cadastrados (12)      │
│ Cong. Central                 │
│  João · Coordenador  [✎][🔑][🗑]│
│ Cong. Norte                   │
│  ...                          │
└───────────────────────────────┘
```

- As duas listas e todas as ações continuam iguais: editar, trocar senha, excluir e senha da aba Anciãos. A tela apenas é dividida em duas partes.
- O app guarda no aparelho qual pílula ficou aberta. Rascunhos e janelas abertas não se perdem ao trocar de pílula.
- O endereço e os links antigos da tela continuam funcionando.

## (04) "O que há de novo" e versão pronta para publicar

- Adicionar um grupo "Circuito e idioma" com estes 3 ajustes.
- A versão continua **5.0.3** (código 32), porque a 5.0.3 ainda não foi enviada à Play Store. Se ela já tiver sido enviada, aviso antes e subo para 5.0.4 (código 33).
- No final, entrego os comandos para copiar e colar:
  - VS Code: `git pull`, `npm install`, `npm run android:release:aab` (gera o app e confere se a cópia está atualizada).
  - Android Studio: abrir `android/` e usar Build → Generate Signed Bundle/APK; ou rodar `npm run android:verify:signature`.

## Detalhes técnicos
- `src/i18n/index.ts`: `detectInitialLanguage` percorre `navigator.languages` (depois `navigator.language`) e mapeia `pt*`, `en*` e `es*`, com fallback para `pt`. O valor só é gravado em `visita-sc-lang` por `changeLanguage` (escolha explícita). Teste unitário para a função pura `pickDeviceLanguage(list)`.
- `_app.configuracoes.tsx`: o bloco `isSuper` do Card não é renderizado. O ramo dos anciãos fica igual.
- `CircuitHeader`: o rótulo da pílula `/congregacoes` passa a usar `circuit.pillCircuit`.
- `_app.congregacoes.tsx`: o estado `section: "congregations" | "elders"` (localStorage) controla as seções com `hidden`, sem desmontar. Os Dialogs ficam fora das seções.
- i18n pt/en/es: `circuit.pillCircuit`, `circuit.sectionCongregations`, `circuit.sectionElders`.
- `release-notes.ts`: novo grupo. AGENTS.md: regra do idioma (escolha explícita vence o idioma do aparelho).
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
