function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Acrescenta texto simples ao fim da nota sem perder o HTML já formatado. */
export function appendPlainTextToNote(content: string, text: string): string {
  const paragraph = `<p>${escapeHtml(text)}</p>`;
  if (!content.trim()) return paragraph;
  if (/<\/?[a-z][\s\S]*>/i.test(content)) return `${content}${paragraph}`;
  return `${content}\n\n${text}`;
}