# Quadro de anúncios — dados iguais à Agenda e novo layout do Modelo Completo

## 1. Informações corretas nos três modelos (principalmente o Serviço de Campo)

**O que verifiquei:** na nuvem, a visita "10 Cidade do Sequele" (17–22/11) tem o campo com local "Teta Lando" (quarta de manhã) e "Casa do irmao Teta" nos outros dias, e os horários batem com o quadro. Mas o quadro saiu com "Salão do Reino / Salao do Reino". Esse texto não está escrito fixo no app, então o quadro está lendo uma cópia diferente da que a Agenda mostra. Ainda não sei qual das duas está desatualizada; isso será o primeiro passo.

**O que vou fazer:**
1. Abrir a Agenda e gerar o quadro com a sua conta, comparando campo por campo de onde cada um tira os dados (nuvem, cópia do aparelho ou alterações ainda não enviadas).
2. Fazer o quadro usar **exatamente a mesma fonte da Agenda**, para tudo: campo (dia, horário, local, modalidade, território, oração), meio de semana, fim de semana, pioneiros e anciãos. Assim o que aparece na Agenda é o que vai para a folha, nos três modelos.
3. Se a Agenda mostrar o local da "designação do superintendente" (ponto de encontro) em vez do local da reunião de campo, sigo o mesmo critério que ela usa.
4. Teste automático: "o local do campo no quadro é igual ao da Agenda".

## 2. Modelo Completo com o layout do seu Modelo 1

Mudanças em relação à folha atual:
- **Pontilhado** ligando o nome da parte ao nome do designado (Cântico… ........ Claucio).
- **Reuniões Especiais** em duas colunas: "Horário e Local" (dia/hora em negrito e o local logo abaixo) | "Reunião" (nome, tema em itálico e orações), em quadro mais estreito e centralizado.
- Restante igual: faixa azul do topo, frase de Isaías, cores por seção (azul, dourado, vermelho), fim de semana com tempos, tabela do campo Dia | Manhã | Local | Tarde | Local, rodapé com Lucas 2:10 e data de emissão.
- Continua cabendo em **uma única folha**.
- O Modelo Simplificado **não muda**.

```text
┌──────────────── Folha A4 ────────────────┐
│█ 17 a 22 nov │ SEMANA DA VISITA │ Congr. █│
│  "...Todos os seus filhos..." Isa. 54:13  │
│        PROGRAMAÇÃO DAS REUNIÕES           │
│ Meio de Semana: Terça às 19:00            │
│ ▪19:00     Cântico 28 e oração .... Claucio│
│ ▪19:05 01m Comentários iniciais ... André │
│ ▪19:06 10m 1. Uma reação ........... Nobre│
│ ...                                       │
│ Fim de Semana: Sábado às 16:15            │
│ ▪16:20 30m Filme - Episódio 2 ...         │
├───────────── REUNIÕES ESPECIAIS ──────────┤
│   Horário e Local   │ Reunião             │
│   Sábado 10:30      │ Reunião c/ Pioneiros│
│   Salão do Reino    │ "Eu os reanimarei"  │
│                     │ Oração: ... / ...   │
├──── REUNIÕES PARA O SERVIÇO DE CAMPO ─────┤
│ Dia  │Manhã│ Local     │Tarde│ Local      │
│Quarta│09:00│ Teta Lando│16:30│ Casa Teta  │
├───────────────────────────────────────────┤
│  Incentivamos todos... – Lucas 2:10       │
│                       Emitido em 19/11/26 │
└───────────────────────────────────────────┘
```

No celular, o painel do Quadro de anúncios fica como está.

## Detalhes técnicos
- `board-program-export.ts` hoje consulta direto com `supabase.from(...)`; a Agenda (`_app.dashboard.tsx`) carrega os mesmos registros pelo caminho do aparelho primeiro. Trocar para `readWithMirror` (local-first.ts) e incluir as alterações pendentes, como a Agenda faz, depois de confirmar com Playwright qual cópia tem "Salao do Reino".
- `board-program.ts` (render do modelo `full`): função de pontilhado entre o texto da parte e o nome, com `fit()` mantido; bloco de Especiais em duas colunas centralizadas; manter a escala automática para uma página.
- Atualizar `board-program.test.ts`; gerar PDFs de exemplo dos três modelos e conferir visualmente.
