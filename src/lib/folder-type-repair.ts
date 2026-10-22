// Repara pastas cujo tipo não bate com os esboços dentro delas (ex.: pastas
// antigas vindas da nuvem sem folder_type, que caíam como "outline").
export interface RepairFolder { id: string; type: string; parentId: string | null; name: string }
export interface RepairNote { id: string; type?: string; folderId?: string | null }

export interface RepairResult<F, N> {
  folders: F[]; // pastas novas ou alteradas
  notes: N[];   // esboços remapeados
}

export function repairFolderTypes<F extends RepairFolder, N extends RepairNote>(
  folders: F[],
  notes: N[],
  defaultNoteType = "field_consideration",
): RepairResult<F, N> {
  const changedF: F[] = [];
  const changedN: N[] = [];
  for (const f of folders) {
    const inside = notes.filter((n) => n.folderId === f.id);
    const types = Array.from(new Set(inside.map((n) => n.type ?? defaultNoteType)));
    if (types.length === 0 || (types.length === 1 && types[0] === f.type)) continue;
    const keep = types.includes(f.type) ? f.type : types[0];
    if (keep !== f.type) changedF.push({ ...f, type: keep });
    for (const t of types) {
      if (t === keep) continue;
      const copy = { ...f, id: `${f.id}__${t}`, type: t, parentId: null } as F;
      changedF.push(copy);
      for (const n of inside) {
        if ((n.type ?? defaultNoteType) === t) changedN.push({ ...n, folderId: copy.id });
      }
    }
  }
  return { folders: changedF, notes: changedN };
}
