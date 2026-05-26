import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw } from "lucide-react";

interface State {
  hasError: boolean;
  isChunkError: boolean;
  error: Error | null;
}

const CHUNK_REGEX =
  /failed to fetch dynamically imported module|loading chunk|chunkloaderror|importing a module script failed/i;

function isChunkError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err ?? "");
  return CHUNK_REGEX.test(msg);
}

function FallbackUI({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="max-w-md w-full border-primary/20">
        <CardContent className="p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <WifiOff className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold">{t("offline.chunkErrorTitle")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("offline.chunkErrorDesc")}
          </p>
          <Button onClick={onRetry} className="mx-auto">
            <RefreshCw className="h-4 w-4 mr-2" /> {t("offline.retry")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export class ChunkErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, isChunkError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, isChunkError: isChunkError(error), error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkError(error)) {
      console.warn("[ChunkErrorBoundary] chunk load falhou:", error.message, info.componentStack);
    } else {
      // Non-chunk errors: log but rethrow so o errorComponent global trate.
      console.error("[ChunkErrorBoundary] non-chunk error:", error);
    }
  }

  handleRetry = () => {
    // Para chunks ausentes, reload é o caminho mais confiável.
    if (typeof window !== "undefined") window.location.reload();
    else this.setState({ hasError: false, isChunkError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return <FallbackUI onRetry={this.handleRetry} />;
      }
      // Re-throw para o errorComponent global da rota.
      throw this.state.error;
    }
    return this.props.children;
  }
}
