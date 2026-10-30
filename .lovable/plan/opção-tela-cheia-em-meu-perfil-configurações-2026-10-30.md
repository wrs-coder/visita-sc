# Opção "Tela cheia" em Meu Perfil → Configurações

Hoje o interruptor "Tela cheia na leitura e no esboço" só existe no cartão "Sobre o app" da tela Itinerário. Ele passa a aparecer também em Meu Perfil → aba Configurações, para todos os perfis.

```text
┌─────────────────────────────┐
│ Meu Perfil                  │
│ (Dados)(Recursos)(Config.)● │
├─────────────────────────────┤
│ ┌─ Idioma ────────────────┐ │
│ │ Português          ▾    │ │
│ └─────────────────────────┘ │
│ ┌─ Tela ──────────────────┐ │
│ │ Tela cheia na leitura   │ │
│ │ e no esboço       [ ●]  │ │
│ │ Esconde a barra de      │ │
│ │ hora/bateria na Bíblia, │ │
│ │ no esboço e no editor.  │ │
│ │ Puxe do topo para ver.  │ │
│ └─────────────────────────┘ │
│ ┌─ Backup ────────────────┐ │
└─────────────────────────────┘
```

- Mesmo interruptor, mesma preferência: ligar/desligar num lugar reflete no outro na hora.
- Padrão continua ligado; desligado, a Bíblia, o esboço em tela cheia e o editor da esposa mantêm a barra do celular visível.
- O cartão em Itinerário permanece (links e hábitos antigos continuam valendo).

## Detalhes técnicos
- `src/routes/_app.perfil.tsx`: novo Card na `TabsContent value="settings"`, logo após o card de Idioma, usando `useImmersivePref()` / `setImmersivePref()` de `src/lib/immersive.ts` e `Switch` do shadcn; ícone `Maximize2`.
- Textos em `pt.json` (e demais locales) sob `profile.immersiveTitle`, `profile.immersiveLabel`, `profile.immersiveHelp`.
- Sem mudança de banco, versão ou formato de dados; validar com `bunx tsgo --noEmit` e `bunx vitest run`.
