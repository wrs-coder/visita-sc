# Trocar as janelinhas "visitasc.com.br diz:" pelo diálogo elegante do app

## O que muda para você
Todas as janelinhas cinzas do navegador (pedir nome, "Excluir?", "Tem certeza?") passam a abrir no cartão moderno do app, igual às abas Campo, Reuniões, Anciãos e Perguntas. Nenhuma função muda: mesmos textos, mesmos botões, mesmo resultado.

## Prévia visual

Pedir um nome (Novo modelo, Nova pasta, Renomear, Link, Título do tópico):
```text
┌──────────────────────────────┐
│░░░░░░░░ (tela escurecida) ░░░│
│ ┌──────────────────────────┐ │
│ │ Novo modelo              │ │
│ │ ┌──────────────────────┐ │ │
│ │ │ Modelo 2           ✕ │ │ │  ← teclado já aberto,
│ │ └──────────────────────┘ │ │    texto selecionado
│ │ [ Cancelar ] [ Salvar  ] │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Confirmar exclusão (botão vermelho, padrão iOS/One UI):
```text
┌──────────────────────────────┐
│ ┌──────────────────────────┐ │
│ │ Excluir modelo?          │ │
│ │ "Modelo 2" será apagado. │ │
│ │ Não dá para desfazer.    │ │
│ │ [ Cancelar ] [ Excluir ] │ │
│ │              (vermelho)  │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Confirmação comum (ex.: marcar semana concluída): igual, com botão azul "Confirmar".

## Onde será aplicado (todas as ~50 ocorrências encontradas)
- Modelos de Visita: Novo, Renomear e excluir em todas as subabas.
- Esboços / Estudo pessoal: nova pasta, renomear, excluir, puxar da nuvem, importar.
- Área da esposa: pastas, nota explicativa, apagar itens, restaurar.
- Editor de texto: link e título do tópico com tempo.
- Congregações, Lixeira, Notas, Cronograma, Programa dos anciãos, senha da aba.
- Grandes Eventos e modelos de carta, Sincronização (descartar), Gerenciar Bíblia.

## Exceção (fica como está)
- Aviso "sair sem salvar" ao fechar/voltar em Reuniões (bloqueio de navegação precisa de resposta imediata do sistema). Nada quebra.

## Detalhes técnicos
- Novo `src/components/ui/app-dialogs.tsx`: provedor montado uma vez no `__root`, com `appConfirm({title, description, confirmLabel, destructive})` e `appPrompt({title, defaultValue, placeholder})` retornando Promise (boolean / string|null). Usa AlertDialog/Dialog shadcn e tokens existentes.
- Fallback: se o provedor não estiver montado (testes/SSR), cai no `window.confirm/prompt` — comportamento atual preservado.
- Cada `if (!confirm(...)) return;` vira `if (!(await appConfirm(...))) return;` (handlers tornam-se async); extensão TipTap `outline-topic.ts` chama `appPrompt` de forma assíncrona e só aplica o comando depois da resposta.
- Teste novo cobrindo: confirmar → true, cancelar → null/false, Enter salva, nome vazio desabilita Salvar.
- Validação: `bunx tsgo --noEmit` e `bunx vitest run`. Sem mudança de banco, sem bump de versão.
