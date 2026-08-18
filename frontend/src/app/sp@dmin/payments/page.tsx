import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, X, Loader2, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import AdminLoader from '@/components/AdminLoader';
import AdminPagination from '@/components/AdminPagination';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function PendingPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paymentToApprove, setPaymentToApprove] = useState<any>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/payments/admin/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setPayments(data);
    } catch (error) {
      toast.error('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmApprove = async () => {
    if (!paymentToApprove) return;
    try {
      setApproving(true);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/payments/admin/${paymentToApprove.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success(`Payment for ${paymentToApprove.tenant?.businessName || 'tenant'} approved & subscription activated!`);
        setPaymentToApprove(null);
        fetchPayments(); // Refresh list
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to approve payment');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error approving payment');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">Pending Manual Payments</h1>
        <p className="text-[12px] text-slate-600 dark:text-zinc-400 mt-1">Review and approve transaction IDs submitted by tenants.</p>
      </div>

      <div className="bg-white dark:bg-surface border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm dark:shadow-lg">
        {loading ? (
          <AdminLoader message="Loading pending manual payments..." />
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-zinc-500">
            No pending payments at the moment.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] text-left text-slate-800 dark:text-zinc-300 min-w-[650px]">
                <thead className="text-[11px] uppercase bg-slate-100 dark:bg-zinc-900/50 text-slate-700 dark:text-zinc-400 font-semibold border-b border-slate-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-3 py-2.5">Tenant</th>
                    <th className="px-3 py-2.5">Plan</th>
                    <th className="px-3 py-2.5">Amount</th>
                    <th className="px-3 py-2.5">TrxID</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {payments.slice((page - 1) * pageSize, page * pageSize).map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/20 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">{payment.tenant?.businessName || 'Unknown'}</td>
                      <td className="px-3 py-2.5 text-slate-700 dark:text-zinc-300">{payment.subscription?.plan?.name || 'Unknown Plan'}</td>
                      <td className="px-3 py-2.5 font-mono text-amber-600 dark:text-amber-500 font-bold">
                        ৳ {Number(payment.amountBdt || payment.amount || 0).toLocaleString()} BDT
                      </td>
                      <td className="px-3 py-2.5 font-mono select-all text-slate-700 dark:text-zinc-400 font-medium">{payment.trxId}</td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-zinc-500">{new Date(payment.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => setPaymentToApprove(payment)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-[#1F824A] hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <AdminPagination
              currentPage={page}
              totalItems={payments.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {paymentToApprove && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface border border-slate-200 dark:border-surface-hover text-slate-900 dark:text-zinc-100 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-surface-hover pb-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <CreditCard className="w-4 h-4" />
                Confirm Payment Approval
              </div>
              <button 
                onClick={() => setPaymentToApprove(null)}
                disabled={approving}
                className="p-1 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs flex-1 overflow-y-auto">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Are you sure you want to approve this transaction? This will instantly activate the tenant's subscription plan.</span>
              </div>

              <div className="bg-slate-50 dark:bg-surface-hover/30 border border-slate-200 dark:border-surface-hover rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-surface-hover/50">
                  <span className="text-slate-600 dark:text-zinc-400">Tenant</span>
                  <span className="font-bold text-slate-900 dark:text-white">{paymentToApprove.tenant?.businessName || 'Unknown'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-surface-hover/50">
                  <span className="text-slate-600 dark:text-zinc-400">Target Plan</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">{paymentToApprove.subscription?.plan?.name || 'Subscription Plan'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-surface-hover/50">
                  <span className="text-slate-600 dark:text-zinc-400">Amount Paid</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">৳ {Number(paymentToApprove.amountBdt || paymentToApprove.amount || 0).toLocaleString()} BDT</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 dark:text-zinc-400">Transaction ID (TrxID)</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-zinc-200 select-all">{paymentToApprove.trxId}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-surface-hover">
              <button
                type="button"
                onClick={() => setPaymentToApprove(null)}
                disabled={approving}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-surface-hover/50 hover:bg-slate-200 dark:hover:bg-surface-hover rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={approving}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {approving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve & Activate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
