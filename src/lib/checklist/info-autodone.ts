/** Ao salvar "Informação" com texto, a pergunta fica concluída. Texto vazio não desmarca. */
export function infoSavePatch(info: string): { info_text: string; status?: "done" } {
  return info.trim() ? { info_text: info, status: "done" } : { info_text: info };
}
