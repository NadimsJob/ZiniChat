'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { 
 Receipt, 
 CheckCircle2, 
 Clock, 
 XCircle, 
 ArrowRight, 
 RefreshCw, 
 ExternalLink,
 CreditCard,
 ShieldCheck,
 AlertCircle
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import { toast, Toaster } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function BillingHistoryPage() {
 const { language } = useLanguage();
 const { formatBdtDirect } = useCurrency();
 const [payments, setPayments] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetchHistory();
 }, []);

 const fetchHistory = async () => {
 setLoading(true);
 try {
 const token = Cookies.get('access_token');
 const res = await fetch(`${API}/payments/my-history`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 if (res.ok) {
 const data = await res.json();
 setPayments(data || []);
 }
 } catch (err) {
 console.error('Failed to fetch billing history', err);
 toast.error(language === 'en' ? 'Failed to load billing history' : 'বিলিং হিস্ট্রি লোড করতে ব্যর্থ হয়েছে');
 } finally {
 setLoading(false);
 }
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
 <Clock className="w-3 h-3" />
 {language === 'en' ? 'Pending' : 'অপেক্ষমান'}
 </span>
 );
 }
 if (st === 'cancelled') {
 return (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
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
 <div className="max-w-6xl mx-auto space-y-6 pb-12">
 <Toaster position="top-right" />

 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/70 backdrop-blur-xl p-6 rounded-2xl border border-border">
 <div>
 <h1 className="text-xl font-bold flex items-center gap-2">
 <Receipt className="w-5 h-5 text-primary" />
 {language === 'en' ? 'Billing & Purchase History' : 'বিলিং এবং ক্রয়ের হিস্ট্রি'}
 </h1>
 <p className="text-[13px] text-muted-foreground mt-1">
 {language === 'en' 
 ? 'View all your past subscription purchases, pending invoices, and retry payments directly.' 
 : 'আপনার সকল সাবস্ক্রিপশন ক্রয়, পেন্ডিং ইনভয়েস দেখুন এবং পুনরায় পেমেন্ট সম্পন্ন করুন।'}
 </p>
 </div>
 <button
 onClick={fetchHistory}
 className="self-start md:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 :bg-zinc-700/80 rounded-xl text-[12px] font-semibold flex items-center gap-2 transition-all border border-border"
 >
 <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
 {language === 'en' ? 'Refresh' : 'রিফ্রেশ করুন'}
 </button>
 </div>

 {/* History Table Container */}
 <div className="bg-surface/70 backdrop-blur-xl rounded-2xl border border-border overflow-hidden shadow-xl">
 {loading ? (
 <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
 <RefreshCw className="w-6 h-6 animate-spin text-primary" />
 <span className="text-[13px]">
 {language === 'en' ? 'Loading billing transactions...' : 'বিলিং লেনদেন লোড করা হচ্ছে...'}
 </span>
 </div>
 ) : payments.length === 0 ? (
 <div className="p-12 text-center space-y-3">
 <CreditCard className="w-12 h-12 text-muted-foreground/40 mx-auto" />
 <h3 className="text-base font-bold">
 {language === 'en' ? 'No Payment History Found' : 'কোনো পেমেন্ট ইতিহাস পাওয়া যায়নি'}
 </h3>
 <p className="text-[13px] text-muted-foreground max-w-sm mx-auto">
 {language === 'en' 
 ? 'You have not initiated any payments yet. Choose a subscription package to get started.' 
 : 'আপনি এখনো কোনো পেমেন্ট শুরু করেননি। শুরু করতে একটি সাবস্ক্রিপশন প্যাকেজ বেছে নিন।'}
 </p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-[12px]">
 <thead className="bg-slate-50 border-b border-border text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
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
 <tbody className="divide-y divide-border">
 {payments.map((p) => {
 const itemName = p.addon?.name || p.subscription?.plan?.name || 'Subscription Package';
 const isAddon = !!p.addonId;
 const isPendingOrFailed = p.status === 'pending' || p.status === 'failed';

 return (
 <tr key={p.id} className="hover:bg-slate-50/50 :bg-zinc-800/30 transition-colors">
 <td className="px-5 py-4 whitespace-nowrap text-zinc-400 font-mono">
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
 <td className="px-5 py-4 uppercase font-semibold text-zinc-400">
 {p.provider || 'MFS'}
 </td>
 <td className="px-5 py-4 font-mono text-zinc-300">
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
 className="px-3 py-1.5 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-500 text-white rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all text-[11px] inline-flex items-center gap-1"
 >
 <span>{language === 'en' ? 'Pay Now' : 'পেমেন্ট করুন'}</span>
 <ExternalLink className="w-3 h-3" />
 </button>
 ) : p.status === 'success' ? (
 <span className="text-[11px] text-emerald-500 font-bold flex items-center justify-end gap-1">
 <ShieldCheck className="w-3.5 h-3.5" />
 {language === 'en' ? 'Completed' : 'সম্পন্ন'}
 </span>
 ) : (
 <span className="text-[11px] text-zinc-500 font-medium">
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
