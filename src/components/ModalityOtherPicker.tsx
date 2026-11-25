import { useId, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { rememberOther, rememberedOthers } from "@/lib/ministry-modality";
import { cn } from "@/lib/utils";

/** Menu de modalidade + campo livre quando "Outro" (key "outro") é escolhido.
 *  Os textos digitados ficam lembrados no aparelho como sugestão. */
export function ModalityOtherPicker({
  options, value, other, onChange, onOtherCommit, scope, disabled, className, otherPlaceholder = "Qual modalidade?",
}: {
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  other: string;
  onChange: (key: string, other: string) => void;
  onOtherCommit?: (other: string) => void;
  scope: string;
  disabled?: boolean;
  className?: string;
  otherPlaceholder?: string;
}) {
  const listId = useId();
  const remembered = useMemo(() => (value === "outro" ? rememberedOthers(scope) : []), [value, scope]);
  return (
    <div className={cn("space-y-2", className)}>
      <Select value={value} onValueChange={(v) => onChange(v, v === "outro" ? other : "")} disabled={disabled}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {value === "outro" && (
        <>
          <Input
            className="h-9"
            list={listId}
            placeholder={otherPlaceholder}
            value={other}
            maxLength={80}
            disabled={disabled}
            onChange={(e) => onChange("outro", e.target.value)}
            onBlur={(e) => { rememberOther(scope, e.target.value); onOtherCommit?.(e.target.value); }}
          />
          <datalist id={listId}>{remembered.map((r) => <option key={r} value={r} />)}</datalist>
        </>
      )}
    </div>
  );
}
