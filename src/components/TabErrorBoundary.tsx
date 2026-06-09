import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State { hasError: boolean; message: string }

/**
 * Boundary leve para isolar falhas de UMA aba sem derrubar a tela inteira
 * (ex.: aba "Pioneiros" da Semana da Visita quebra → as demais continuam
 * usáveis). Não substitui o ChunkErrorBoundary do layout — soma-se a ele.
 */
export class TabErrorBoundary extends Component<{ label?: string; children: ReactNode }, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? "Erro desconhecido" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[TabErrorBoundary]", this.props.label ?? "", error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: "" });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 mt-2 text-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-destructive">
              {this.props.label ?? "Esta aba apresentou um erro"}
            </div>
            <div className="text-muted-foreground mt-1 break-words">{this.state.message}</div>
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }
}
