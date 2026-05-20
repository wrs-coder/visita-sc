# DIRETRIZES OBRIGATÓRIAS DE ARQUITETURA - VISITA SC

## 1. Regras de Roles (Perfis de Utilizador)

- O 'superintendent' (Superintendente) gerencia o circuito e NÃO possui uma congregação fixa atrelada ao seu perfil. O circuito ativo dele é definido dinamicamente pelas datas do Itinerário.
- Os 'anciaos' (Anciãos locais) possuem uma congregação fixa vinculada ao seu perfil.
- NUNCA bloqueies uma tela para o Superintendente sob o pretexto de falta de congregação fixa. Se o utilizador for Superintendente, exibe seletores (dropdowns) para ele escolher a congregação ou herda o contexto do Itinerário.

## 2. Padrão de Modelos (Templates) e Itinerário

- O aplicativo segue o padrão de criação de "Modelos" neutros na nuvem.
- A vinculação dos Modelos deve ser feita OBRIGATORIAMENTE no momento da criação ou edição da visita na aba Itinerário. Não existem campos opcionais para modelos aqui. A escolha é estritamente obrigatória para conseguir validar e criar a visita.
- Ao aplicar um modelo, os dados devem ser copiados para a tabela de destino da visita, respeitando as permissões de edição de ambos os perfis (Superintendente e Anciãos).
- Na sub-aba "Pioneiros" dos modelos, o campo de data deve usar apenas o Dia da Semana (Dropdown) e Horário (Time Picker), sem calendário numérico de datas específicas (Ex: "Sábado, 10:30").
- Na sub-aba "Fim de Semana", o modelo deve permitir múltiplos temas de discursos, gerando um dropdown (lista suspensa) para os anciãos escolherem na aba final da congregação.
- Todos os modelos devem ter a opção de "duplicar modelo".

## 3. Segurança e RLS (Supabase)

- Todas as tabelas que envolvem registros de congregações (como 'talk_themes', 'meeting_templates', etc.) DEVEM possuir políticas de RLS que permitam explicitamente que a role 'superintendent' faça INSERT, UPDATE, SELECT e DELETE em qualquer registro do seu circuito.
- Antes de gerar qualquer alteração de código que envie dados ao servidor, certifica-te de que as tabelas e políticas de RLS acompanham a permissão do Superintendente para evitar o erro "new row violates row-level security policy".

## 4. Persistência Local (Rascunho)

- Telas de preenchimento complexo (como Reuniões e Discursos) devem utilizar salvamento automático em localStorage (por usuário e congregação) como rascunho.
- O envio real para o banco de dados (Supabase) só deve ocorrer após o clique explícito no botão "Salvar dados".

## 5. Regras do Itinerário e Painel Inicial (Dashboard)

- A aba "Itinerário" é um calendário livre de planejamento anual. É proibido limitar o cadastro a 3 congregações ou usar indicadores/botões de "congregação ativa" dentro dela.
- O Painel Inicial (Dashboard) do Superintendente deve manter o layout moderno de blocos elegantes (cards) para o resumo do dia atual (Refeições, Transporte, Estudos/Revisitas e Reunião de Campo).
