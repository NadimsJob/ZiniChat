'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function PendingPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const approvePayment = async (id: string) => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/payments/admin/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
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

  if (loading) return <div className="p-4 text-zinc-400">Loading...</div>;

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-[15px] font-bold tracking-tight">Pending Manual Payments</h1>
        <p className="text-[12px] text-zinc-400 mt-1">Review and approve transaction IDs submitted by tenants.</p>
      </div>

      <div className="bg-surface border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        {payments.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            No pending payments at the moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] text-left text-zinc-300">
              <thead className="text-[11px] uppercase bg-zinc-900/50 text-zinc-400 font-semibold">
                <tr className="border-b border-zinc-800">
                  <th className="px-3 py-2.5">Tenant</th>
                  <th className="px-3 py-2.5">Plan</th>
                  <th className="px-3 py-2.5">Amount</th>
                  <th className="px-3 py-2.5">TrxID</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-surface/40">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-3 py-2.5 font-medium">{payment.tenant?.businessName || 'Unknown'}</td>
                    <td className="px-3 py-2.5">{payment.subscription?.plan?.name || 'Unknown Plan'}</td>
                    <td className="px-3 py-2.5 font-mono text-amber-500 font-bold">
                      ৳ {Number(payment.amountBdt || payment.amount || 0).toLocaleString()} BDT
                    </td>
                    <td className="px-3 py-2.5 font-mono select-all text-zinc-400 font-medium">{payment.trxId}</td>
                    <td className="px-3 py-2.5 text-zinc-500">{new Date(payment.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => approvePayment(payment.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1F824A]/10 text-[#1F824A] hover:bg-[#1F824A]/20 border border-[#1F824A]/20 rounded-lg text-[11px] font-bold transition-all"
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
        )}
      </div>
    </div>
  );
}
