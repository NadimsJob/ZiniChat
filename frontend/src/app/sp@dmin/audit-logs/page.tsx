'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-[15px] font-bold tracking-tight">Audit Logs</h1>
        <p className="text-zinc-400 mt-2">Monitor system-wide administrative actions and security events.</p>
      </div>

      <div className="bg-surface border border-surface-hover rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left">
          <thead className="bg-surface-hover/50 text-zinc-400 text-[12px]">
            <tr>
              <th className="px-3 py-2 font-medium">Timestamp</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Actor User</th>
              <th className="px-3 py-2 font-medium">Target Tenant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-hover text-[12px]">
            {loading ? (
              <tr><td colSpan={4} className="px-3 py-2 text-center text-zinc-500">Loading logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-2 text-center text-zinc-500">No audit logs found.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="hover:bg-surface-hover/30 transition-colors">
                  <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-medium text-foreground">
                    {log.action}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {log.actorUser?.email || log.actorUserId}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {log.targetTenant?.name || log.targetTenantId || '-'}
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
