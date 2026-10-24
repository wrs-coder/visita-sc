# Termos de Uso com botão de fechar

Hoje a página de Termos só tem um "Voltar" pequeno no canto. No cadastro ela abre numa nova aba, que no app instalado não tem como fechar.

## O que muda
1. **Na tela de login e no cadastro, os Termos abrem num popup** por cima da tela, com o "X" no canto e um botão "Fechar" no fim do texto. A pessoa não sai da tela, e o que já digitou no cadastro fica como estava.
2. **A página própria dos Termos continua existindo** para quem abrir pelo endereço, mas ganha um "X" bem visível no topo que volta para a tela anterior (ou para o login, se não houver tela anterior).
3. O botão voltar do celular também fecha o popup.

O texto dos termos não muda.

## Detalhes técnicos
- Mover `SECTIONS` para `src/components/auth/terms-content.tsx` (`TermsContent`), usado pela página e pelo novo `TermsDialog` (shadcn Dialog com rolagem interna e `DialogClose`).
- `LoginForm.tsx` (link "Termos") e `TermsAcceptance.tsx` (remove `target="_blank"`) passam a abrir o `TermsDialog`.
- `termos-uso.tsx`: botão X com `history.length > 1 ? router.history.back() : navigate({ to: "/" })`.
