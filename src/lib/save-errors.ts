// Mensagens claras (pt-BR) para falhas reais de gravação no aparelho.
export function describeLocalSaveError(e: unknown): string {
  const name = (e as { name?: string })?.name ?? "";
  const msg = (e as { message?: string })?.message ?? String(e ?? "");
  if (/quota/i.test(name) || /quota|exceeded|no space|disk full/i.test(msg)) {
    return "Espaço do aparelho cheio. Libere espaço e toque em Salvar de novo — seu texto continua aqui.";
  }
  return "Não foi possível salvar no aparelho. Tente de novo — seu texto continua aqui.";
}
