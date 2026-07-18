'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useCurrency } from '@/components/CurrencyProvider';

export default function SuperadminPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toCurrency, formatBDT } = useCurrency();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = Cookies.get('access_token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/stats/overview`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-[15px] font-bold tracking-tight">Platform Overview</h1>
        <p className="text-zinc-400 mt-2">Monitor total system health, MRR, and tenant activity.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-surface border border-surface-hover shadow-lg">
          <h3 className="text-[12px] font-medium text-zinc-400 mb-1">Total Tenants</h3>
          <p className="text-[15px] font-bold text-foreground">
            {loading ? '...' : stats?.totalTenants || 0}
          </p>
        </div>
        
        <div className="p-3 rounded-xl bg-surface border border-surface-hover shadow-lg">
          <h3 className="text-[12px] font-medium text-zinc-400 mb-1">MRR ({toCurrency})</h3>
          <p className="text-[15px] font-bold text-foreground">
            {loading ? '...' : formatBDT(stats?.totalRevenue || 0)}
          </p>
        </div>
        
        <div className="p-3 rounded-xl bg-surface border border-surface-hover shadow-lg">
          <h3 className="text-[12px] font-medium text-zinc-400 mb-1">AI Tokens Used</h3>
          <p className="text-[15px] font-bold text-foreground">
            {loading ? '...' : stats?.totalAiTokens || 0}
          </p>
        </div>
        
        <div className="p-3 rounded-xl bg-surface border border-surface-hover shadow-lg">
          <h3 className="text-[12px] font-medium text-zinc-400 mb-1">System Health</h3>
          <p className="text-[15px] font-bold text-emerald-400">99.9%</p>
          <p className="text-xs text-zinc-500 mt-2">All systems operational</p>
        </div>
      </div>
    </div>
  );
}
