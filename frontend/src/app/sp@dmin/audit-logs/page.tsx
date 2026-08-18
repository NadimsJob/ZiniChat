'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import AdminLoader from '@/components/AdminLoader';
import AdminPagination from '@/components/AdminPagination';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
        <h1 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">Audit Logs</h1>
        <p className="text-slate-600 dark:text-zinc-400 mt-2">Monitor system-wide administrative actions and security events.</p>
      </div>

      <div className="bg-white dark:bg-surface border border-slate-200 dark:border-surface-hover rounded-xl overflow-hidden shadow-sm dark:shadow-lg">
        {loading ? (
          <AdminLoader message="Loading administrative audit logs..." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[650px]">
                <thead className="bg-slate-100/90 dark:bg-surface-hover/50 text-slate-700 dark:text-zinc-400 text-[12px]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Timestamp</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                    <th className="px-3 py-2 font-medium">Actor User</th>
                    <th className="px-3 py-2 font-medium">Target Tenant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-surface-hover text-[12px] text-slate-900 dark:text-zinc-200">
                  {logs.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500 dark:text-zinc-500">No audit logs found.</td></tr>
                  ) : (
                    logs.slice((page - 1) * pageSize, page * pageSize).map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-surface-hover/30 transition-colors">
                        <td className="px-3 py-2 text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                          {log.action}
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-zinc-300">
                          {log.actorUser?.email || log.actorUserId}
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-zinc-300">
                          {log.targetTenant?.name || log.targetTenantId || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <AdminPagination
              currentPage={page}
              totalItems={logs.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>
    </div>
  );
}
