# Plano — Grandes Eventos: nuvem, importar oradores e exportar para outro aparelho

## (01) Os 10 eventos da conta IBE-01 que não aparecem

**O que a investigação mostrou:** na nuvem da conta IBE-01 existem só **2 eventos**, os dois criados hoje (13/11, às 17:24 e 17:29):
- "Encontre a Mais Plena Alegria em Jeová" (28/11), com 24 partes
- "Feliz É Aquele Que Confia em Jeová" (29/11), com 27 partes

Os outros 8 **nunca chegaram à nuvem**, ou foram apagados dela. Por isso o botão ☁ não os traz: não há nada lá para baixar. Hoje não fica nenhum registro de exclusão desses eventos, então não consigo dizer qual das duas coisas aconteceu.

Também achei um risco: o botão **"☁ Baixar da nuvem"** troca a lista inteira do aparelho pela da nuvem. Num celular que ainda guarda eventos que só existem nele, esses eventos seriam apagados.

**Correções:**
1. **"Baixar da nuvem" não apaga mais nada do aparelho.** Ele junta o que vem da nuvem com o que existe só no celular. Os eventos que estão só no aparelho ganham o selo "📱 Só neste aparelho".
2. **Novo botão "☁↑ Enviar todos para a nuvem"**, ao lado de "Baixar". Ele manda à nuvem todos os eventos e partes do aparelho que ainda não estão lá. É assim que você recupera os 8 eventos: abra o app no **celular onde eles foram criados** e toque nesse botão.
3. **Criar ou duplicar evento:** se a gravação na nuvem falhar, o evento fica marcado "📱 Só neste aparelho" e é reenviado sozinho na próxima sincronização. Nada de falha silenciosa.
4. **Diagnóstico simples** no topo: "Nuvem: 2 eventos · Aparelho: 10 eventos".

```text
┌──────────────────────────────────────┐
│ Grandes Eventos                      │
│ [☁↓ Baixar]   [☁↑ Enviar todos]      │
│ Nuvem: 2 · Aparelho: 10              │
│ ┌──────────────────────────────────┐ │
│ │ Feliz É Aquele…   29/11          │ │
│ │ ☁ Atualizado 13/11 às 17:29      │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Assembleia Set.   19/09          │ │
│ │ 📱 Só neste aparelho  [Enviar]   │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## (02) Importar oradores: mais formatos, presidente e oração, e troca antes de aplicar

**Novos formatos reconhecidos** (pelos 3 arquivos que você enviou):
- **PDF da "Programação espiritual"**, em tabela com as colunas NÚM | Tema | Cântico | Tempo | Cena | Orador | Congregação. Lê números como "01", "S-1" (série) e "--" (sem número).
- **PDF "Programa" gerado pelo próprio app**: a linha de baixo traz "Nome · Cong. X | Tipo · min". O app ignora "Ancião a definir" e "Superintendente de circuito".
- **Word "Designações"** (cartas): blocos com "Ancião: Nome — Cong." e "Sua designação: Parte Nº 10".

**Preenchimento extra:**
- **Presidente** (do programa ou da sessão): vem de "Música (Presidente da seção)" e "Presidente do programa".
- **Orações**: vêm de "Cântico e Oração inicial", "Oração" e "Cântico e Oração final".

Esses nomes vão para as partes de presidente e de oração que já existem no programa. A ligação é feita pela sessão (manhã ou tarde) e pela ordem no programa, não por número.

**Revisão antes de aplicar:** cada linha mostra o nome que veio do arquivo e um seletor **"Vai para: Nº __"**. Se o irmão do Nº 10 aparecer no Nº 11, basta trocar no seletor. Os dois nomes trocam de lugar, e aparece o aviso "Trocado". Também dá para corrigir o nome e a congregação tocando no lápis.

```text
┌──────────────────────────────────────┐
│ Importar oradores                    │
│ Arquivo: Progr_espiritual_BR.pdf     │
│ 14 encontrados · 2 presid. · 3 oraç. │
│ ── Manhã ──────────────────────────  │
│ [x] Presidente                       │
│     Francisco D. L. Manuel  ✎        │
│     Cid. do Sequele 05               │
│ [x] Oração inicial                   │
│     Nicodemos Alves  ✎               │
│ [x] Vai para: [Nº 10 ▾]              │
│     Araújo Tokes P. Fernandes  ✎     │
│     Funda 01                         │
│     ⚠ Trocado com Nº 11              │
│ [ ] Nº 6 · Paulo João José           │
│     🔒 Já confirmado                 │
│ [Cancelar]      [Aplicar 16]         │
└──────────────────────────────────────┘
```

Tudo o que já funciona continua igual: CSV, Excel, Word simples e o PDF do programa oficial (CA-BR). Partes confirmadas continuam protegidas.

## (03) Exportar o evento para outro aparelho, com ou sem designações

Ao tocar **"Arquivo para outro aparelho"** no Exportar, abre uma escolha:

```text
┌──────────────────────────────────────┐
│ Arquivo para outro aparelho          │
│ ( ) Só as partes                     │
│     Programa, temas, horários,       │
│     sem nomes                        │
│ (•) Partes + designações             │
│     Com oradores, congregações,      │
│     presidente e orações             │
│ Nunca vão: PINs, links, respostas.   │
│ [ Gerar arquivo ]                    │
└──────────────────────────────────────┘
```

O arquivo é criado no próprio aparelho e funciona **sem internet**: pode ser enviado por WhatsApp, Bluetooth ou Nearby Share. O outro aparelho abre em "Importar", como já faz hoje. Ao importar, as designações chegam como "pendente", com links novos.

## Detalhes técnicos
- `cloud-sync.ts`: `downloadAllEvents` passa a juntar as listas (nuvem por id + linhas locais ausentes, marcadas `localOnly`). Novo `pushAllLocal()` envia com upsert, dentro de `withNetworkWindow`. Não muda o banco nem o RLS.
- `BigEvents.tsx`: falhas ao criar ou duplicar ficam no espelho com a marca local e são reenviadas em `refreshStatuses`. Contadores nuvem/aparelho.
- `speaker-import.ts`: três novos leitores (`programacaoEspiritualRows`, `appProgramRows`, `designacoesDocxRows`), papéis `chairman` e `prayer` com a sessão, ligação às partes por `part_type_id` e pela ordem. Diálogo com seletor de destino que troca dois itens, e edição de nome e congregação.
- Exportar "share": a opção `withAssignments` remove `speaker_name`, `speaker_congregation` e o status quando desligada. Sempre remove `pin_hash`, `personal_token` e `personal_code`.
- Testes: um teste para cada formato, usando os arquivos enviados como base; um para a troca Nº 10 ↔ Nº 11; um para a junção que nunca apaga eventos só locais; um para exportar com e sem designações.
