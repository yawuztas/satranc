import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-12 max-w-xl rounded-2xl border border-rose-500/40 bg-slate-900/95 p-6 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-white">
            {this.props.fallbackTitle || 'Arayüzde Beklenmeyen Bir Durum Oluştu'}
          </h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Tahta veya motor hesaplaması sırasında bir arayüz hatası yakalandı. Ekranın kararmasını önlemek için güvenli moda geçildi.
          </p>
          {this.state.error && (
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-2.5 text-left font-mono text-[11px] text-rose-300/80">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400 shadow-lg"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Yeniden Başlat</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
