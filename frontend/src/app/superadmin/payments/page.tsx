'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PendingPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await fetch('http://localhost:3000/payments/admin/pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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

  const approvePayment = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3000/payments/admin/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        toast.success('Payment approved and subscription activated');
        fetchPayments(); // Refresh list
      } else {
        toast.error('Failed to approve payment');
      }
    } catch (error) {
      toast.error('Error approving payment');
    }
  };

  if (loading) return <div className="p-2.5">Loading...</div>;

  return (
    <div className="p-2.5 space-y-3">
      <div>
        <h1 className="text-[13px] font-bold">Pending Manual Payments</h1>
        <p className="text-[12px] text-zinc-400 mt-1">Review and approve transaction IDs submitted by tenants.</p>
      </div>

      <div className="bg-surface border border-zinc-800 rounded-xl overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-2.5 text-center text-zinc-500">
            No pending payments at the moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] text-left text-zinc-300">
              <thead className="text-xs uppercase bg-zinc-800/50 text-zinc-400">
                <tr>
                  <th className="px-3 py-2">Tenant</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">TrxID</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-zinc-800/30">
                    <td className="px-3 py-2 font-medium">{payment.tenant?.businessName || 'Unknown'}</td>
                    <td className="px-3 py-2">{payment.subscription?.plan?.name || 'Unknown Plan'}</td>
                    <td className="px-3 py-2 font-mono text-primary">${payment.amount}</td>
                    <td className="px-3 py-2 font-mono">{payment.trxId}</td>
                    <td className="px-3 py-2">{new Date(payment.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => approvePayment(payment.id)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-medium transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
