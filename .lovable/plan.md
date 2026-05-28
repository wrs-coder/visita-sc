## Correção: Popover bíblico atrás do modo tela cheia

**Causa:** O `OutlineFullscreen` usa `z-50` (mesmo nível do `PopoverContent` padrão do Radix), então o popover renderiza por baixo.

**Mudança única (somente UI, aditiva):**

Em `src/components/bible/BibleVersePopover.tsx`, no `<PopoverContent>`, adicionar `z-[60]` à className:

```tsx
<PopoverContent
  className="w-80 max-w-[90vw] max-h-[60vh] overflow-y-auto z-[60]"
  align="start"
>
```

O `PopoverContent` do shadcn já usa `Popover.Portal` (anexado ao `document.body`), então não é necessário tocar em portal/portalled — apenas garantir a camada acima do `z-50` da tela cheia.

**Não alteradas:** lógica do popover, store IndexedDB, fullscreen, exportações, fila offline, RLS, restrições do superintendente.

**Validação:** abrir um esboço em tela cheia, clicar em uma referência bíblica e confirmar que o popup aparece sobre o overlay; rodar os testes existentes (`bible-refs.test.ts`) para garantir que nada quebrou.