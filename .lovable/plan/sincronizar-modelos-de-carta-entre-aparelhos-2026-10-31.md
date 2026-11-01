# Sincronizar modelos de carta entre aparelhos

## Situação atual
- Os pacotes da visita já sincronizam: ficam numa tabela só do superintendente, e o aparelho guarda uma cópia para funcionar sem internet.
- Os modelos de carta ficam só no aparelho. Se você criar um modelo no celular, ele não aparece no tablet nem no navegador.

## Riscos (todos baixos)
1. **Mudança no banco de dados:** é preciso criar uma tabela nova só para os modelos de carta. Nenhuma tabela ou permissão que já existe muda. Como isso vai contra a regra "nunca alterar o banco", só faço com a sua autorização.
2. **Sem internet:** o modelo é salvo no aparelho na hora e enviado quando a internet voltar, igual aos pacotes da visita.
3. **Edição em dois aparelhos ao mesmo tempo:** vale a última versão salva. Para modelos de carta isso quase nunca acontece.
4. **Modelos que já existem:** na primeira vez, os modelos do aparelho são enviados uma vez só, sem duplicar e sem apagar nada.
5. **Escolha do modelo de cada evento:** continua guardada no aparelho. Se o modelo escolhido não existir em outro aparelho, a carta usa o modelo padrão e nunca dá erro.
6. **Privacidade:** só o superintendente dono vê os próprios modelos. Anciãos, esposa e oradores não têm acesso.
7. **APK atual:** continua funcionando só no aparelho até a próxima atualização. Nada quebra.

## Visual (padrão iOS / One UI)
```text
┌──────────────────────────────┐
│ Modelos de carta        [+]  │
│ ☁ Sincronizado · agora       │
│ ┌──────────────────────────┐ │
│ │ ★ Carta Nº 13 (padrão)   │ │
│ │   Editado hoje 14:20     │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │   Assembleia de Circuito │ │
│ │   ⟳ Aguardando internet  │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```
A única mudança na tela é uma linha pequena com o estado da sincronização.

## Ordem segura
1. Criar a tabela nova `letter_templates`, só para o dono (com a sua autorização).
2. Salvar no aparelho primeiro e enviar depois, seguindo o mesmo jeito dos pacotes da visita.
3. Enviar uma vez os modelos que já estão no aparelho, sem duplicar.
4. Fazer testes de juntar versões, de uso sem internet e de modelo ausente. Depois rodar a conferência de erros e todos os testes.

## Detalhes técnicos
- Tabela `letter_templates(id uuid, user_id uuid, name text, data jsonb, is_default bool, updated_at)`. A tabela tem RLS para `auth.uid() = user_id`, permissões GRANT para authenticated e não tem FK para auth.users.
- `letter-template.ts`: localStorage passa a ser cache. O upsert usa o `updatedAt` mais recente e a remoção é suave.
- A escolha do modelo de cada evento continua em `bigEvents.eventTemplate.<userId>`.
- Sem mudar a versão do app.
