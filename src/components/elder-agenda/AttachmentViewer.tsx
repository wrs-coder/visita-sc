// Visualizador em tela cheia (estilo iOS/One UI) para foto e PDF da pauta: abre, lê, minimiza ou fecha.
// Nada é salvo no aparelho; o PDF é desenhado página a página com pdf.js carregado só quando preciso.
import { useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Loader2, Minus, Plus, X, ChevronDown } from "lucide-react";
import { useViewerDoc, viewerStore, type ViewerDoc } from "./attachment-viewer-store";

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; destroy: () => Promise<void> };
type PdfPage = { getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } };

async function loadPdf(blob: Blob): Promise<PdfDoc> {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  return (await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise) as unknown as PdfDoc;
}

function PdfPageCanvas({ pdf, n, width, zoom }: { pdf: PdfDoc; n: number; width: number; zoom: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(n <= 2);
  const [ratio, setRatio] = useState(1.414);
  useEffect(() => {
    const el = box.current; if (!el || visible) return;
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) setVisible(true); }, { rootMargin: "600px" });
    io.observe(el); return () => io.disconnect();
  }, [visible]);
  useEffect(() => {
    if (!visible || !width) return;
    let dead = false;
    void (async () => {
      const page = await pdf.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const cssW = width * zoom;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const vp = page.getViewport({ scale: (cssW / base.width) * dpr });
      const c = ref.current; if (dead || !c) return;
      setRatio(base.height / base.width);
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      c.style.width = `${cssW}px`; c.style.height = `${(cssW * base.height) / base.width}px`;
      const ctx = c.getContext("2d"); if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
    })().catch(() => undefined);
    return () => { dead = true; };
  }, [pdf, n, width, zoom, visible]);
  return (
    <div ref={box} data-page={n} className="mx-auto" style={{ width: width * zoom, minHeight: width * zoom * ratio }}>
      <canvas ref={ref} className="block rounded-md bg-background shadow-sm" aria-label={`Página ${n}`} />
    </div>
  );
}

function ViewerBody({ doc }: { doc: ViewerDoc }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const [err, setErr] = useState(false);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(doc.page);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    const el = scroller.current; if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.min(el.clientWidth - 24, 900)));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (doc.kind === "photo") { const u = URL.createObjectURL(doc.blob); setPhoto(u); return () => URL.revokeObjectURL(u); }
    let d: PdfDoc | null = null; let dead = false;
    loadPdf(doc.blob).then((p) => { if (dead) void p.destroy(); else { d = p; setPdf(p); } }).catch(() => setErr(true));
    return () => { dead = true; if (d) void d.destroy(); };
  }, [doc.blob, doc.kind]);
  // Volta para a página onde estava ao reabrir.
  useEffect(() => {
    if (!pdf || !width || doc.page <= 1) return;
    const t = setTimeout(() => scroller.current?.querySelector(`[data-page="${doc.page}"]`)?.scrollIntoView({ block: "start" }), 50);
    return () => clearTimeout(t);
  }, [pdf, width]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    const el = scroller.current; if (!el) return;
    const top = el.getBoundingClientRect().top + 80;
    let cur = 1;
    el.querySelectorAll<HTMLElement>("[data-page]").forEach((p) => { if (p.getBoundingClientRect().top <= top) cur = Number(p.dataset.page); });
    if (cur !== page) { setPage(cur); viewerStore.setPage(cur); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-muted" role="dialog" aria-modal="true" aria-label={doc.title}>
      <header className="pt-safe flex items-center gap-1 border-b bg-background/85 px-2 pb-2 backdrop-blur-xl">
        <button type="button" onClick={() => viewerStore.close()} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-full text-primary active:bg-muted"><X className="h-5 w-5" /></button>
        <p className="flex-1 min-w-0 truncate text-center text-[15px] font-semibold">{doc.title}</p>
        <button type="button" onClick={() => viewerStore.minimize()} aria-label="Minimizar" className="flex h-10 w-10 items-center justify-center rounded-full text-primary active:bg-muted"><ChevronDown className="h-5 w-5" /></button>
      </header>
      <div ref={scroller} onScroll={onScroll} className="flex-1 overflow-auto overscroll-contain py-3 [touch-action:pan-x_pan-y_pinch-zoom]">
        {doc.kind === "photo" ? (
          photo ? <img src={photo} alt={doc.title} className="mx-auto rounded-md" style={{ width: width ? width * zoom : "100%", maxWidth: "none" }} /> : null
        ) : err ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Não foi possível mostrar este PDF.</p>
        ) : !pdf || !width ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3 px-3">
            {Array.from({ length: pdf.numPages }, (_, i) => <PdfPageCanvas key={i + 1} pdf={pdf} n={i + 1} width={width} zoom={zoom} />)}
          </div>
        )}
      </div>
      <footer className="pb-safe flex items-center justify-center gap-4 border-t bg-background/85 px-3 pt-2 backdrop-blur-xl">
        <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Diminuir" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-primary"><Minus className="h-4 w-4" /></button>
        <span className="w-14 text-center text-sm tabular-nums">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} aria-label="Aumentar" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-primary"><Plus className="h-4 w-4" /></button>
        {pdf ? <span className="ml-2 text-sm text-muted-foreground tabular-nums">{page} / {pdf.numPages}</span> : null}
      </footer>
    </div>
  );
}

/** Montado uma vez na tela da pauta: mostra o visualizador ou a pílula de minimizado. */
export function AttachmentViewerHost() {
  const doc = useViewerDoc();
  useEffect(() => () => viewerStore.close(), []);
  if (!doc) return null;
  if (!doc.minimized) return <ViewerBody key={doc.id} doc={doc} />;
  const Icon = doc.kind === "pdf" ? FileText : ImageIcon;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center pb-safe pointer-events-none">
      <div className="pointer-events-auto flex max-w-[90vw] items-center gap-1 rounded-full border bg-background/90 py-1 pl-3 pr-1 shadow-lg backdrop-blur-xl">
        <button type="button" onClick={() => viewerStore.restore()} className="flex min-w-0 items-center gap-2 py-1.5 text-sm font-medium" aria-label={`Reabrir ${doc.title}`}>
          <Icon className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{doc.title}</span>
        </button>
        <button type="button" onClick={() => viewerStore.close()} aria-label="Fechar documento" className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
