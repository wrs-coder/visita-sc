import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";

/**
 * App-styled replacements for window.confirm / window.prompt.
 * Mounted once (AppDialogsHost in __root). Without a host (tests/SSR) they
 * fall back to the native browser dialogs, so behavior never regresses.
 */
export type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};
export type PromptOptions = {
  title: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
};

type Req =
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "prompt"; opts: PromptOptions; resolve: (v: string | null) => void };

let push: ((r: Req) => void) | null = null;

const DESTRUCTIVE_RE = /excluir|apagar|remover|descartar|esvaziar|delete|remove|discard|eliminar|borrar/i;

/** Accepts a plain message (like window.confirm) or options. */
export function appConfirm(input: string | ConfirmOptions): Promise<boolean> {
  const opts: ConfirmOptions = typeof input === "string" ? { description: input } : input;
  if (opts.destructive === undefined) {
    opts.destructive = DESTRUCTIVE_RE.test(`${opts.title ?? ""} ${opts.description ?? ""}`);
  }
  if (!push) {
    if (typeof window === "undefined") return Promise.resolve(false);
    return Promise.resolve(window.confirm([opts.title, opts.description].filter(Boolean).join("\n")));
  }
  const p = push;
  return new Promise((resolve) => p({ kind: "confirm", opts, resolve }));
}

/** Like window.prompt: resolves the typed text, or null when cancelled. */
export function appPrompt(title: string, defaultValue?: string, extra?: Omit<PromptOptions, "title" | "defaultValue">): Promise<string | null> {
  const opts: PromptOptions = { title, defaultValue, ...extra };
  if (!push) {
    if (typeof window === "undefined") return Promise.resolve(null);
    return Promise.resolve(window.prompt(title, defaultValue ?? ""));
  }
  const p = push;
  return new Promise((resolve) => p({ kind: "prompt", opts, resolve }));
}

export function AppDialogsHost() {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<Req[]>([]);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const cur = queue[0];

  useEffect(() => {
    // Deferred one tick so a closing dropdown/menu releases focus first
    // (otherwise Radix can leave the page unclickable).
    push = (r) => { window.setTimeout(() => setQueue((q) => [...q, r]), 0); };
    return () => { push = null; };
  }, []);

  useEffect(() => {
    if (cur?.kind === "prompt") {
      setValue(cur.opts.defaultValue ?? "");
      const id = window.setTimeout(() => inputRef.current?.select(), 60);
      return () => window.clearTimeout(id);
    }
  }, [cur]);

  const finish = (ok: boolean) => {
    if (!cur) return;
    if (cur.kind === "confirm") cur.resolve(ok);
    else cur.resolve(ok ? value : null);
    setQueue((q) => q.slice(1));
  };

  const cancel = t("common.cancel", { defaultValue: "Cancelar" });
  const isPrompt = cur?.kind === "prompt";
  const destructive = cur?.kind === "confirm" && cur.opts.destructive;
  const okLabel = cur
    ? cur.opts.confirmLabel ??
      (isPrompt ? t("common.save", { defaultValue: "Salvar" }) : destructive ? t("common.delete", { defaultValue: "Excluir" }) : t("common.confirm", { defaultValue: "Confirmar" }))
    : "";
  const confirmTitle = cur?.kind === "confirm" ? cur.opts.title : undefined;
  const confirmDesc = cur?.kind === "confirm" ? cur.opts.description : undefined;

  return (
    <AlertDialog open={!!cur} onOpenChange={(o) => { if (!o) finish(false); }}>
      <AlertDialogContent className="max-w-[calc(100vw-32px)] rounded-2xl sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">
            {isPrompt ? (cur.opts as PromptOptions).title : confirmTitle ?? (confirmDesc && confirmDesc.length <= 70 ? confirmDesc : t("common.confirm", { defaultValue: "Confirmar" }))}
          </AlertDialogTitle>
          {!isPrompt && confirmDesc && (confirmTitle || confirmDesc.length > 70) && (
            <AlertDialogDescription className="whitespace-pre-line">{confirmDesc}</AlertDialogDescription>
          )}
          {!isPrompt && !confirmTitle && confirmDesc && confirmDesc.length <= 70 && (
            <AlertDialogDescription className="sr-only">{confirmDesc}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {isPrompt && (
          <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) finish(true); }}>
            <Input
              ref={inputRef}
              autoFocus
              value={value}
              placeholder={(cur.opts as PromptOptions).placeholder}
              onChange={(e) => setValue(e.target.value)}
              aria-label={(cur.opts as PromptOptions).title}
              className="h-11 rounded-xl"
            />
          </form>
        )}
        <AlertDialogFooter className="flex-row gap-2 sm:justify-end">
          <AlertDialogCancel className="mt-0 flex-1 rounded-xl sm:flex-none" onClick={() => finish(false)}>{cancel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPrompt && !value.trim()}
            className={`flex-1 rounded-xl sm:flex-none ${destructive ? buttonVariants({ variant: "destructive" }) : ""}`}
            onClick={(e) => { e.preventDefault(); finish(true); }}
          >
            {okLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
