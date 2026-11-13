# Grandes Eventos aparecendo em todos os aparelhos da conta

## O que está acontecendo
Os eventos **estão salvos na conta** (na nuvem), não só no aparelho. A falha está na **leitura** no outro aparelho:

- Para abrir rápido e funcionar sem internet, o app mostra primeiro a **cópia guardada no próprio celular**.
- Na tela de Grandes Eventos, ao abrir com internet, o app só busca na nuvem as **respostas dos oradores** das partes que já conhece. Ele **não busca eventos novos** criados em outro aparelho.
- Por isso o outro aparelho só vê o evento depois do **⟳ Sincronizar** daquela tela, do "Sincronizar tudo" no Perfil ou da sincronização automática diária (02:00).

Esboços, cartas modelo e modelos de visita já buscam novidades sozinhos; Grandes Eventos ficou para trás.

## O que vou corrigir
Ao abrir a tela de Grandes Eventos **com internet**:
1. O app baixa da nuvem **os eventos e as partes** (não só as respostas).
2. Atualiza a lista na tela com o que veio: eventos novos aparecem, editados mudam e excluídos somem.
3. Sem internet, continua mostrando a cópia do aparelho, como hoje.

Nada muda no visual da tela, nem nos links, PINs, cartas ou relógio.

```text
Aparelho A cria "Assembleia 2027"
            │  (salvo na conta)
            ▼
Aparelho B abre Grandes Eventos com internet
   → baixa eventos + partes → "Assembleia 2027" aparece
```

## Detalhes técnicos
- `BigEvents.tsx`: `refreshStatuses` passa a chamar `syncTables` com `circuit_big_events` e `circuit_big_event_parts` e, em caso de sucesso, recarrega ambas as listas inteiras do espelho (`getRows`), em vez de só corrigir status das partes existentes. Mantém limite de 8 s e o canal ao vivo.
- Sem mudança de banco/RLS.
- Teste novo garantindo que a atualização ao abrir inclui as duas tabelas; atualizar regra em `src/lib/AGENTS.md`.
- Conferir no navegador: evento criado direto na nuvem aparece ao abrir a tela sem tocar ⟳.
