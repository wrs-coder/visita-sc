# Importar itinerário (.ics / .csv) — avaliação e plano

## Avaliação do plano enviado

Funciona e é estável, com quatro ajustes importantes:

1. **Sem `ical.js` / `node-ical`**: `node-ical` não roda no aparelho, e `ical.js` é pesado para o que precisamos. Um leitor pequeno próprio cobre o necessário (SUMMARY, DTSTART, DTEND, linhas quebradas, eventos de dia inteiro, fuso) e funciona offline.
2. **Datas de dia inteiro no .ics**: o DTEND é "exclusivo" (uma visita de seg a dom vem com fim na segunda seguinte). Sem esse ajuste, toda visita importada ganharia um dia a mais.
3. **CSV brasileiro**: o Excel em português salva com `;` e datas `dd/mm/aaaa`. O leitor detecta `;` ou `,`, aceita `dd/mm/aaaa` e `aaaa-mm-dd`, e reconhece os títulos das colunas com ou sem acento ("Congregacao", "Inicio").
4. **Semelhança de nomes**: o `fuse.js` já está instalado, então não é preciso nada novo. Antes de comparar, os nomes são limpos (tira "Cong.", "Congregação", acentos e maiúsculas). Assim "Cong. Central do Sequele" casa com "Central" sem cair em 🟡.

## Melhorias que sugiro

- **Conflitos**: avisar quando a semana já tem visita ou semana livre no itinerário ("Já existe: Central 12/10"). Essas linhas vêm desmarcadas.
- **Marcar/desmarcar cada linha**: importar só o que quiser.
- **Pacote de modelos opcional**: um seletor "Aplicar pacote" no topo. Ele aplica os modelos exatamente como o formulário de nova visita já faz.
- **Lembrar nomes corrigidos**: se você trocar "Esperanca II" por "Nova Esperança", o aparelho lembra e na próxima importação já vem 🟢.
- **"Semana livre / Pioneiros"** como opção no seletor da linha, para itinerários que trazem semanas sem visita.
- **Precisa de internet só no "Confirmar"**: a leitura e a revisão funcionam offline. O botão avisa se estiver sem conexão, em vez de salvar pela metade.

## Refinamentos a partir dos seus arquivos reais

Os dois arquivos vêm do Circuit Assistant. Por isso o importador terá um modo próprio para esse formato, mais preciso que a semelhança genérica.

**.ics (19 eventos)**
- O nome vem embutido: `(Visita à Congregação) - Cidade do Sequele 09 - Sequele,, I.B (20398)`. O app recorta só "Cidade do Sequele 09" antes de comparar; o número entre parênteses é ignorado. A variante "(Visita à Congregação - Treinando SCS)" também é reconhecida.
- `Serviço de Circuito: Semana de Pioneiro` vira **Semana de pioneiro** no itinerário. `Assembleia de Circuito…` e `Escola do Ministério do Reino` viram **Semana livre** com o nome do evento (o mesmo "Outro" que já existe).
- O fim é exclusivo: 27/10 → 02/11 significa terça 27/10 a domingo 01/11. O app corrige sozinho.
- A descrição traz o tema do discurso de serviço e do discurso público. Opção marcável "Trazer temas dos discursos" para preencher esses dois campos da visita. Horários de reunião e de campo **não** são importados: os modelos/pacotes já cuidam disso e evitamos sobrescrever.

**.csv (19 semanas)**
- Separador `;`. Datas por extenso: "13 a 18 de outubro de 2026", "27 de outubro a 01 de novembro de 2026" e também "29/12/2026 a 03/01/2027". As três formas são entendidas.
- Coluna "Tipo": Visita Regular → visita; Semana de Pioneiro → semana de pioneiro; outros (ex.: "Assembleia com Rep. Betel") → semana livre com esse nome.
- Coluna "Esquema" (ex.: "Treinando: Alberto Luvumba Silva") vai como observação da semana.
- Colunas de avisos/despesas/concluída são ignoradas.
- Números são comparados sem zero à esquerda: "Mayé-Mayé 1" casa com "Mayé-Mayé 01" como 🟢.

**Reimportar com segurança**: semanas já cadastradas (mesma data e congregação, ou semana livre/pioneiro nas mesmas datas) aparecem como "Já existe" e desmarcadas. Importar o mesmo arquivo de novo não duplica nada.

## Mockup

```text
+-------------------------------------+
| Itinerário   [Importar ⤒] [+ Nova]  |
+-------------------------------------+

+------ Importar itinerário ----------+
| itinerario_2027.csv · 4 semanas     |
| Pacote: [ Nenhum            ▾ ]     |
|-------------------------------------|
| ☑ 12/10 – 18/10              🟢     |
|   "Cong. Central do Sequele"        |
|   [ Central                 ▾ ]     |
| ☑ 19/10 – 25/10              🟡     |
|   "Esperanca II"                    |
|   [ Nova Esperança          ▾ ]     |
| ☐ 26/10 – 01/11              🔴     |
|   "Bairro da Luz"                   |
|   [ Selecionar…             ▾ ]     |
| ☐ 02/11 – 08/11              ⚠      |
|   Já existe: Central 02/11          |
|-------------------------------------|
| [Cancelar]   [Importar 2 visitas]   |
+-------------------------------------+
```

Legenda: 🟢 vinculada sozinha · 🟡 sugestão, confira · 🔴 escolha manual · ⚠ conflito.

## Fica igual

Formulário de nova visita, modelos, pacotes, banco de dados e regras de acesso. Também continua valendo o limite de congregações ativas. A importação só cria visitas pelo mesmo caminho do formulário.

## Detalhes técnicos

- `src/lib/itinerary-import.ts` (puro e testável):
  - `parseIcs` (desdobra as linhas, trata VALUE=DATE com fim exclusivo menos 1 dia e DATE-TIME com fuso local);
  - `parseCsv` (detecta o separador, entende aspas e mapeia os títulos das colunas, inclusive "Semana" em `dd/mm–dd/mm`);
  - `normalizeName` e `matchCongregation` com Fuse (pontuação de 0 a 100, cortes em 85/50);
  - `findConflicts` contra visitas e `itinerary_weeks`.
- `src/components/itinerary/ImportItineraryDialog.tsx`: tela de revisão; nomes corrigidos ficam no localStorage por usuário (`itineraryImport.aliases.<userId>`).
- `_app.configuracoes.tsx`: botão "Importar" e a criação de cada linha reaproveitando a função existente de salvar visita + aplicar o pacote. As linhas são processadas uma a uma, com um resumo de sucesso ou falha no fim.
- Testes: dia inteiro no .ics (fim exclusivo), CSV com `;` e `dd/mm/aaaa`, "Cong. X" casando com 🟢, cortes 85/50, detecção de conflito.
- Validação com `bunx tsgo --noEmit` e `bunx vitest run`.
