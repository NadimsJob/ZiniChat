'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Cookies from 'js-cookie';
import { 
  Receipt, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Sparkles,
  Crown,
  BellOff,
  Filter,
  Search
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import { toast, Toaster } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function BillingHistoryPage() {
  const { language } = useLanguage();
  const { formatBdtDirect, formatNumber } = useCurrency();
  
  const [payments, setPayments] = useState<any[]>([]);
  const [upcomingBill, setUpcomingBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [historyRes, upcomingRes] = await Promise.all([
        fetch(`${API}/payments/my-history`, { headers }),
        fetch(`${API}/payments/upcoming-bill`, { headers })
      ]);

      if (historyRes.ok) {
        const data = await historyRes.json();
        setPayments(data || []);
      }
      if (upcomingRes.ok) {
        const upData = await upcomingRes.json();
        setUpcomingBill(upData);
      }
    } catch (err) {
      console.error('Failed to fetch billing history', err);
      toast.error(language === 'en' ? 'Failed to load billing history' : 'বিলিং হিস্ট্রি লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handlePayAdvance = () => {
    let url = '';
    if (upcomingBill?.planId) {
      url = `/dashboard/billing/pay-mfs?planId=${upcomingBill.planId}&billingCycle=${upcomingBill.billingCycle || 'monthly'}`;
    } else {
      url = `/dashboard/settings/subscription`;
    }
    window.open(url, '_blank');
  };

  const handleRetryPayment = (payment: any) => {
    let url = '';
    if (payment.addonId) {
      url = `/dashboard/billing/pay-mfs?addonId=${payment.addonId}`;
    } else if (payment.subscription?.planId) {
      url = `/dashboard/billing/pay-mfs?planId=${payment.subscription.planId}&billingCycle=${payment.subscription.billingCycle || 'monthly'}`;
    } else {
      url = `/dashboard/billing/pay-mfs?paymentId=${payment.id}`;
    }
    window.open(url, '_blank');
  };

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Status filter
      const st = p.status?.toLowerCase();
      if (statusFilter === 'success' && st !== 'success' && st !== 'approved') return false;
      if (statusFilter === 'pending' && st !== 'pending') return false;
      if (statusFilter === 'failed' && st !== 'failed' && st !== 'cancelled') return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const itemName = (p.addon?.name || p.subscription?.plan?.name || 'Subscription Package').toLowerCase();
        const trx = (p.trxId || '').toLowerCase();
        const amount = String(p.amountBdt || '');
        if (!itemName.includes(query) && !trx.includes(query) && !amount.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [payments, statusFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    const st = status?.toLowerCase();
    if (st === 'success' || st === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          {language === 'en' ? 'Successful' : 'সফল'}
        </span>
      );
    }
    if (st === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <Clock className="w-3 h-3 text-amber-400" />
          {language === 'en' ? 'Pending' : 'অপেক্ষমান'}
        </span>
      );
    }
    if (st === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-muted text-muted-foreground border border-border">
          <XCircle className="w-3 h-3" />
          {language === 'en' ? 'Cancelled' : 'বাতিল'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
        <AlertCircle className="w-3 h-3" />
        {language === 'en' ? 'Failed' : 'ব্যর্থ'}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 text-foreground">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/70 backdrop-blur-xl p-6 rounded-2xl border border-surface-hover shadow-sm">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            {language === 'en' ? 'Billing & Purchase History' : 'বিলিং এবং ক্রয়ের হিস্ট্রি'}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {language === 'en' 
              ? 'View upcoming renewal dates, pay in advance, and access past payment receipts.' 
              : 'আপনার আগামীর বিলিং তারিখ দেখুন, অগ্রিম পেমেন্ট করুন এবং পূর্ববর্তী রসিদগুলো দেখুন।'}
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="self-start md:self-auto px-4 py-2 bg-surface-hover hover:bg-surface-hover/80 rounded-xl text-[12px] font-semibold flex items-center gap-2 transition-all border border-surface-hover text-foreground"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {language === 'en' ? 'Refresh' : 'রিফ্রেশ করুন'}
        </button>
      </div>

      {/* UPCOMING BILL / ADVANCE PAYMENT CARD */}
      {upcomingBill && (
        <div className="bg-gradient-to-r from-primary/10 via-purple-500/5 to-secondary/10 border border-primary/20 backdrop-blur-xl rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Left Bill Details */}
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-yellow-400" />
                  {upcomingBill.planName}
                </span>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  ({upcomingBill.billingCycle === 'yearly' ? (language === 'en' ? 'Yearly' : 'বার্ষিক') : (language === 'en' ? 'Monthly' : 'মাসিক')})
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {language === 'en' ? 'Next Renewal Date:' : 'পরবর্তী রিনিউয়াল তারিখ:'}{' '}
                  <span className="text-primary">
                    {new Date(upcomingBill.nextBillDate).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
                      dateStyle: 'full'
                    })}
                  </span>
                </h3>
                <p className="text-[12px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {formatNumber(upcomingBill.daysRemaining)} {language === 'en' ? 'days remaining in current cycle' : 'দিন অবশিষ্ট আছে'}
                  </span>
                </p>
              </div>

              {/* No Reminder Email Guarantee Pill */}
              <div className="flex items-center gap-2 text-[12px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl w-fit">
                <BellOff className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  {language === 'en' 
                    ? 'Pay in advance anytime to extend your plan & disable payment reminder emails.'
                    : 'যেকোনো সময় অগ্রিম বিল পরিশোধ করে সাবস্ক্রিপশন বাড়ান ও রিমাইন্ডার ইমেইল বন্ধ রাখুন।'}
                </span>
              </div>
            </div>

            {/* Right Upcoming Amount & ALWAYS-ENABLE PAY BUTTON */}
            <div className="bg-surface/80 border border-surface-hover p-5 rounded-2xl text-center md:text-right shrink-0 min-w-[260px] space-y-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {language === 'en' ? 'Upcoming Bill Amount' : 'আগামী বিলের পরিমাণ'}
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-0.5">
                  {formatBdtDirect(upcomingBill.amountBdt)}
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handlePayAdvance}
                  className="w-full px-5 py-2.5 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span>{language === 'en' ? 'Pay / Renew Now' : 'এখনই পেমেন্ট করুন →'}</span>
                </button>

                {upcomingBill.hasPendingPayment && (
                  <div className="text-[10px] text-amber-400 font-semibold text-center flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{language === 'en' ? 'Verification Pending (TrxID: ' + upcomingBill.pendingTrxId + ')' : 'ভেরিফিকেশন পেন্ডিং আছে'}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* History Table Container with Filters */}
      <div className="bg-surface/70 backdrop-blur-xl rounded-2xl border border-surface-hover overflow-hidden shadow-xl space-y-4 p-5">
        
        {/* Table Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-hover">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold text-foreground">{language === 'en' ? 'Filter Payments:' : 'পেমেন্ট ফিল্টার:'}</span>
            <div className="flex items-center gap-1 bg-surface-hover/60 border border-surface-hover p-1 rounded-xl">
              {[
                { id: 'all', label: language === 'en' ? 'All' : 'সব' },
                { id: 'success', label: language === 'en' ? 'Successful' : 'সফল' },
                { id: 'pending', label: language === 'en' ? 'Pending' : 'পেন্ডিং' },
                { id: 'failed', label: language === 'en' ? 'Failed' : 'ব্যর্থ' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === f.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={language === 'en' ? 'Search TrxID or Package...' : 'TrxID বা প্যাকেজ খুঁজুন...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-surface-hover rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none focus:border-primary text-foreground"
            />
          </div>
        </div>

        {/* Payments Table */}
        {loading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-[13px]">
              {language === 'en' ? 'Loading billing transactions...' : 'বিলিং লেনদেন লোড করা হচ্ছে...'}
            </span>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CreditCard className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <h3 className="text-base font-bold">
              {language === 'en' ? 'No Matching Payments' : 'কোনো পেমেন্ট পাওয়া যায়নি'}
            </h3>
            <p className="text-[13px] text-muted-foreground max-w-sm mx-auto">
              {language === 'en' 
                ? 'No transactions found matching your filter criteria.' 
                : 'আপনার সিলেক্ট করা ফিল্টারের সাথে কোনো ট্রানজেকশন মেলেনি।'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-surface-hover/60 border-b border-surface-hover text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">{language === 'en' ? 'Date & Time' : 'তারিখ ও সময়'}</th>
                  <th className="px-5 py-3.5">{language === 'en' ? 'Package / Addon' : 'প্যাকেজ / অ্যাডঅন'}</th>
                  <th className="px-5 py-3.5">{language === 'en' ? 'Method' : 'পেমেন্ট মেথড'}</th>
                  <th className="px-5 py-3.5">{language === 'en' ? 'Trx ID' : 'ট্রানজেকশন আইডি'}</th>
                  <th className="px-5 py-3.5">{language === 'en' ? 'Amount' : 'পরিমাণ'}</th>
                  <th className="px-5 py-3.5">{language === 'en' ? 'Status' : 'স্ট্যাটাস'}</th>
                  <th className="px-5 py-3.5 text-right">{language === 'en' ? 'Action' : 'অ্যাকশন'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-hover/40">
                {filteredPayments.map((p) => {
                  const itemName = p.addon?.name || p.subscription?.plan?.name || 'Subscription Package';
                  const isAddon = !!p.addonId;
                  const isPendingOrFailed = p.status === 'pending' || p.status === 'failed';

                  return (
                    <tr key={p.id} className="hover:bg-surface-hover/30 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-muted-foreground font-mono">
                        {new Date(p.createdAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="px-5 py-4 font-semibold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{itemName}</span>
                          {isAddon && (
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold">
                              ADDON
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 uppercase font-semibold text-muted-foreground">
                        {p.provider || 'MFS'}
                      </td>
                      <td className="px-5 py-4 font-mono text-foreground/80">
                        {p.trxId || 'N/A'}
                      </td>
                      <td className="px-5 py-4 font-bold font-mono text-amber-500">
                        {formatBdtDirect(p.amountBdt)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {getStatusBadge(p.status)}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {isPendingOrFailed ? (
                          <button
                            onClick={() => handleRetryPayment(p)}
                            className="px-3 py-1.5 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-500 text-white rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>{language === 'en' ? 'Pay / Retry' : 'পেমেন্ট করুন'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : p.status === 'success' ? (
                          <span className="text-[11px] text-emerald-500 font-bold flex items-center justify-end gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {language === 'en' ? 'Completed' : 'সম্পন্ন'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {language === 'en' ? 'No Action' : 'কোনো অ্যাকশন নেই'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
