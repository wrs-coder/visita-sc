# Eventos e cartas: o que já fica salvo na conta

## Resposta curta
Sua preocupação é válida, mas a maior parte **já fica salva na sua conta**, igual aos esboços e às visitas. Se o celular ou o notebook sumir, basta entrar com a sua conta em outro aparelho.

Já fica salvo na conta (aparece em qualquer aparelho):
- Eventos (nome, data, local, horários, modo do link)
- Todas as partes, oradores e congregações
- Confirmações dos oradores (Confirmado / Aguardando / Recusado), que chegam ao vivo
- Links dos convites (os links já enviados continuam funcionando)
- Modelos de carta

Fica só no aparelho (de propósito):
1. **O número do PIN em texto.** Por segurança, a conta guarda só uma versão embaralhada. Os oradores que já receberam o PIN continuam entrando normalmente. Mas, em outro aparelho, você não consegue **ver** esse número.
2. **O controle de tempo e o relatório dele.** Ele é feito no dia, em um aparelho só.

## O que proponho ajustar (pequeno)
- Em outro aparelho, o "Ver/alterar PIN" passa a mostrar uma mensagem clara:

```text
┌──────────────────────────────┐
│ PIN do convite               │
│                              │
│ O PIN foi criado em outro    │
│ aparelho. Os oradores que já │
│ receberam continuam entrando.│
│                              │
│ [ Criar novo PIN ]           │
│ (o PIN antigo para de valer) │
└──────────────────────────────┘
```
- Nada muda nos dados nem no servidor.

## Detalhes técnicos
- `circuit_big_events`, `circuit_big_event_parts` e `letter_templates` já são tabelas na nuvem por usuário; o PIN em texto fica em localStorage e só o hash salgado vai ao servidor.
- Ajuste só em `BigEvents.tsx` (diálogo do PIN quando `readPin` volta vazio e o evento já tem hash). Sem mudança de banco/RLS.
- O controle de tempo segue local (regra existente).
