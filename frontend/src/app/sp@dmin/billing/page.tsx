'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

export default function BillingPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/billing/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-[15px] font-bold tracking-tight">Billing & Subscriptions</h1>
        <p className="text-zinc-400 mt-2">View active subscriptions and recent payments.</p>
      </div>

      <div className="bg-surface border border-surface-hover rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left">
          <thead className="bg-surface-hover/50 text-zinc-400 text-[12px]">
            <tr>
              <th className="px-3 py-2 font-medium">Tenant</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Expires At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-hover text-[12px]">
            {loading ? (
              <tr><td colSpan={4} className="px-3 py-2 text-center text-zinc-500">Loading subscriptions...</td></tr>
            ) : subscriptions.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-2 text-center text-zinc-500">No active subscriptions.</td></tr>
            ) : (
              subscriptions.map(sub => (
                <tr key={sub.id} className="hover:bg-surface-hover/30 transition-colors">
                  <td className="px-3 py-2 font-medium text-foreground">{sub.tenant?.businessName || 'Unknown'}</td>
                  <td className="px-3 py-2 text-zinc-300">{sub.plan?.name || 'Custom'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {sub.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
