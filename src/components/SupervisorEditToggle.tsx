import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Eye, Pencil } from "lucide-react";

interface Props {
  enabled: boolean;
  onChange: (v: boolean) => void;
}

/**
 * Banner shown to the superintendent on supervised-edit tabs.
 * Default is read-only; turning the switch on unlocks editing.
 */
export function SupervisorEditToggle({ enabled, onChange }: Props) {
  return (
    <Card className={enabled ? "border-primary/40 bg-primary/5" : "bg-muted/40"}>
      <CardContent className="p-3 flex items-center gap-3">
        {enabled ? <Pencil className="h-4 w-4 text-primary shrink-0" /> : <Eye className="h-4 w-4 text-muted-foreground shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{enabled ? "Edição ativa" : "Somente visualização"}</div>
          <div className="text-xs text-muted-foreground">
            {enabled
              ? "Os campos estão editáveis. Salve as alterações em cada item."
              : "Os dados preenchidos pelos anciãos aparecem em modo leitura. Ative para editar."}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline">Ativar edição</span>
          <Switch checked={enabled} onCheckedChange={onChange} aria-label="Ativar edição" />
        </div>
      </CardContent>
    </Card>
  );
}
