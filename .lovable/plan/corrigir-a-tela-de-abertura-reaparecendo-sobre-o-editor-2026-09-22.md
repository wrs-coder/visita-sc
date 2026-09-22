# Corrigir a tela de abertura reaparecendo sobre o editor

## Diagnóstico confirmado

A camada preta da imagem é exatamente o arquivo noturno de abertura incluído no APK, com o mesmo ícone e posicionamento. Ela aparece durante rolagem, abertura/fechamento do teclado e seleção de texto, depois desaparece sozinha.

O tema atual mantém o bitmap completo da abertura como fundo da janela principal. Quando o Android redimensiona ou redesenha o editor por causa do teclado e da seleção, esse fundo pode ficar momentaneamente visível sobre a interface. O conteúdo e os dados do esboço continuam intactos por baixo.

## Correção

1. Separar a tela de abertura do fundo permanente da janela Android.
2. Configurar a abertura pelo mecanismo nativo, com fundo e ícone próprios, e troca explícita para o tema normal assim que a tela principal iniciar.
3. Manter no tema normal apenas um fundo sólido compatível com o aplicativo, impedindo o bitmap de reaparecer durante redesenhos.
4. Limpar explicitamente o fundo de abertura ao criar a tela principal, cobrindo aparelhos que mantêm esse desenho em memória.
5. Definir o teclado para redimensionar corretamente a área do editor, sem criar uma superfície temporária sobre o conteúdo.

## Limites de segurança

- Não alterar banco de dados, regras de acesso, login online/offline, PIN, biometria ou Bíblia offline.
- Não alterar salvamento, formatação, anexos ou sincronização dos esboços.
- Preservar a abertura inicial com a identidade visual do aplicativo.
- Manter as correções já aplicadas à casca local e à proteção contra tela preta.

## Validação

- Verificar tipos e executar a suíte completa de testes.
- Montar e sincronizar a casca Android 4.2.6 (versionCode 16).
- Conferir abertura inicial em tema claro e escuro.
- Testar no editor: rolar texto, abrir e fechar o teclado repetidamente, selecionar/copiar uma frase e voltar ao aplicativo.
- Confirmar que o editor permanece visível, sem imagem preta, sem perda de texto e sem alteração na posição da rolagem.
