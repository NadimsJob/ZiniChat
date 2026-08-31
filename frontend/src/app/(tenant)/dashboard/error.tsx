'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception details silently to console
    console.error('Dashboard Error Boundary caught an exception:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 sm:p-8 text-center text-foreground animate-in fade-in duration-300">
      <div className="bg-surface/90 backdrop-blur-xl border-2 border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-md">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight text-foreground">
            Dashboard couldn't render
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            A temporary component error occurred while rendering the workspace data. Please reload to try again.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 font-bold text-xs rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
