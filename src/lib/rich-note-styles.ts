/**
 * Classes visuais compartilhadas entre o editor (modo edição) e o
 * renderizador de leitura (modo esboço / tela cheia), para que os três
 * modos exibam exatamente a mesma formatação.
 */
export const RICH_NOTE_CONTENT_CLASS = [
  "[&_p]:my-1 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-1",
  "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1",
  "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1",
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2",
  "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2",
  "[&_li]:my-0.5",
  "[&_mark]:rounded [&_mark]:px-0.5",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
  "[&_table]:my-2 [&_table]:border-collapse [&_table]:w-full",
  "[&_table_td]:border [&_table_td]:border-border [&_table_td]:px-2 [&_table_td]:py-1",
  "[&_table_th]:border [&_table_th]:border-border [&_table_th]:px-2 [&_table_th]:py-1 [&_table_th]:bg-muted [&_table_th]:font-semibold",
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-2",
  "[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:gap-2 [&_ul[data-type=taskList]_li]:items-start",
  "[&_ul[data-type=taskList]_li>label]:mt-1",
  "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-2",
  "[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.9em] [&_code]:font-mono",
  "[&_pre]:bg-muted [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_hr]:my-3 [&_hr]:border-t [&_hr]:border-border",
  "[&_sub]:text-[0.75em] [&_sup]:text-[0.75em]",
].join(" ");
