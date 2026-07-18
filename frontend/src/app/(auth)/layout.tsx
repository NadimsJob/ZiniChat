import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />

      {/* Subtle Back to Home Link */}
      <Link href="/" className="absolute top-6 left-6 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors flex items-center gap-2">
        <span>←</span> Home
      </Link>

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-4">
          <Link href="/" className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity mb-2">
            <img src="/logo.png" alt="ZiniChat Logo" className="h-16 w-auto object-contain" />
          </Link>
          <p className="text-zinc-500 text-sm">Log in or create a new account to manage your business.</p>
        </div>
        
        <div className="bg-surface/50 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
