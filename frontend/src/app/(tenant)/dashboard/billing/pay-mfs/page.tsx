'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { toast, Toaster } from 'react-hot-toast';
import { 
  Smartphone, 
  Landmark, 
  Copy, 
  Check, 
  Loader2, 
  QrCode, 
  ArrowLeft, 
  Clock,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  X,
  CreditCard,
  Building2,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function PayMfsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const { formatBdtDirect } = useCurrency();

  const planId = searchParams.get('planId');
  const addonId = searchParams.get('addonId');
  const billingCycle = searchParams.get('billingCycle') || 'monthly';
  const rawPaymentId = searchParams.get('paymentId');

  const [payment, setPayment] = useState<any>(null);
  const [activeAccounts, setActiveAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'BANGLA_QR' | 'MOBILE' | 'CARD'>('BANGLA_QR');
  
  const [qrPayload, setQrPayload] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [trxId, setTrxId] = useState('');
  const [showTrxField, setShowTrxField] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes countdown
  const [copiedField, setCopiedField] = useState<string>('');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const timerRef = useRef<any>(null);
  const autoCheckRef = useRef<any>(null);
  const trxIdRef = useRef('');

  useEffect(() => {
    trxIdRef.current = trxId;
  }, [trxId]);

  // Load Active Payment Accounts configured by Superadmin
  useEffect(() => {
    fetchActiveAccounts();
  }, []);

  const fetchActiveAccounts = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/mfs-payments/active-providers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const accounts = await res.json();
        setActiveAccounts(accounts || []);

        // Default to Bangla QR if active accounts have Bangla QR, else default to first available
        const hasBanglaQr = accounts.some((a: any) => a.provider === 'BANGLA_QR' || a.accountType === 'MERCHANT');
        if (hasBanglaQr) {
          setActiveTab('BANGLA_QR');
        } else if (accounts.some((a: any) => ['BKASH', 'NAGAD', 'ROCKET', 'UPAY'].includes(a.provider))) {
          setActiveTab('MOBILE');
        } else {
          setActiveTab('CARD');
        }
      }
    } catch (err) {
      console.error('Failed to load active payment providers', err);
    }
  };

  // Initiate or fetch existing payment invoice on load
  useEffect(() => {
    if (rawPaymentId) {
      fetchExistingInvoice(rawPaymentId);
    } else if (planId || addonId) {
      const preApplied = searchParams.get('coupon');
      if (preApplied) {
        setCouponInput(preApplied);
        handleApplyCouponDirect(preApplied);
      } else {
        initiatePaymentInvoice();
      }
    } else {
      toast.error(language === 'en' ? 'Invalid checkout selection' : 'পেমেন্ট সিলেকশন সঠিক নয়');
      router.push('/dashboard/settings/subscription');
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoCheckRef.current) clearInterval(autoCheckRef.current);
    };
  }, [planId, addonId, rawPaymentId]);

  // Start 10-minute timer when payment invoice is ready
  useEffect(() => {
    if (payment) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            toast.error(language === 'en' ? 'Payment window expired' : 'পেমেন্টের সময় শেষ হয়ে গেছে');
            router.push('/dashboard/settings/subscription');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Background auto-verifier check every 4 seconds
      startAutoCheck();
    }
  }, [payment]);

  const fetchExistingInvoice = async (pId: string) => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/payments/my-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const history = await res.json();
        const found = history.find((p: any) => p.id === pId);
        if (found) {
          setPayment(found);
        } else {
          initiatePaymentInvoice();
        }
      }
    } catch (err) {
      initiatePaymentInvoice();
    }
  };

  const handleApplyCouponDirect = async (code: string) => {
    setApplyingCoupon(true);
    setCouponError('');
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/coupons/validate?code=${code}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppliedCoupon(data);
        await initiatePaymentInvoice(code);
      } else {
        const err = await res.json();
        setCouponError(err.message || 'Invalid coupon');
        await initiatePaymentInvoice();
      }
    } catch (err) {
      setCouponError('Error validating coupon');
      await initiatePaymentInvoice();
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleApplyCouponClick = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponError('');
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/coupons/validate?code=${code}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppliedCoupon(data);
        toast.success(language === 'en' ? 'Coupon applied!' : 'কুপন প্রয়োগ করা হয়েছে!');
        if (timerRef.current) clearInterval(timerRef.current);
        if (autoCheckRef.current) clearInterval(autoCheckRef.current);
        setTimeLeft(600);
        await initiatePaymentInvoice(code);
      } else {
        const err = await res.json();
        setCouponError(err.message || 'Invalid coupon');
        toast.error(err.message || 'Invalid coupon');
      }
    } catch (err) {
      setCouponError('Error validating coupon');
      toast.error('Error validating coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const initiatePaymentInvoice = async (appliedCouponCode?: string) => {
    try {
      const token = Cookies.get('access_token');
      const tempTrxId = `PENDING_${Date.now()}`;
      let res;
      
      if (addonId) {
        res = await fetch(`${API}/payments/manual-addon`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ addonId, trxId: tempTrxId })
        });
      } else {
        res = await fetch(`${API}/payments/manual`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            planId,
            trxId: tempTrxId,
            billingCycle,
            couponCode: appliedCouponCode || undefined
          })
        });
      }

      if (res.ok) {
        const data = await res.json();
        setPayment(data);
      } else {
        toast.error('Failed to initialize checkout invoice');
      }
    } catch (err) {
      toast.error('Failed to connect to billing server');
    }
  };

  // Open Payment method details modal
  const handleSelectAccount = async (account: any) => {
    if (!payment) return;
    setSelectedAccount(account);
    setShowPaymentModal(true);

    try {
      const token = Cookies.get('access_token');
      const providerKey = account.provider;
      const res = await fetch(`${API}/mfs-payments/qr-payload/${payment.id}?provider=${providerKey}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const payload = await res.json();
        setQrPayload(payload);
      } else {
        toast.error(`Configuration issue for ${providerKey}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Background real-time verification auto-checker
  const startAutoCheck = () => {
    if (autoCheckRef.current) clearInterval(autoCheckRef.current);
    autoCheckRef.current = setInterval(async () => {
      if (!payment || paymentSuccess) return;
      try {
        const token = Cookies.get('access_token');
        const currentTrx = trxIdRef.current.trim().toUpperCase();
        
        const res = await fetch(`${API}/mfs-payments/verify`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paymentId: payment.id,
            trxId: currentTrx || undefined
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setPaymentSuccess(true);
            toast.success(language === 'en' ? 'Payment Verified & Activated!' : 'পেমেন্ট ভেরিফাই সফল হয়েছে!');
            clearInterval(autoCheckRef.current);
            setTimeout(() => {
              window.location.href = `/dashboard/settings/subscription?payment=success&id=${payment.id}`;
            }, 1200);
          }
        }
      } catch (err) {
        // Silent check
      }
    }, 4000);
  };

  const handleManualVerify = async () => {
    if (!payment) return;
    setVerifying(true);
    try {
      const token = Cookies.get('access_token');
      const cleanTrx = trxId.trim().toUpperCase();
      const res = await fetch(`${API}/mfs-payments/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId: payment.id,
          trxId: cleanTrx
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentSuccess(true);
        toast.success(language === 'en' ? 'Payment verified successfully!' : 'পেমেন্ট সফলভাবে ভেরিফাই হয়েছে!');
        setTimeout(() => {
          window.location.href = `/dashboard/settings/subscription?payment=success&id=${payment.id}`;
        }, 1200);
      } else {
        toast.error(data.message || (language === 'en' ? 'Payment not detected yet. Please double check.' : 'পেমেন্ট এখনো সনাক্ত করা যায়নি। অনুগ্রহ করে পরীক্ষা করুন।'));
      }
    } catch (err) {
      toast.error('Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(language === 'en' ? 'Copied to clipboard!' : 'কপি করা হয়েছে!');
    setTimeout(() => setCopiedField(''), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter Active Accounts by selected top tab
  const banglaQrAccounts = activeAccounts.filter(a => a.provider === 'BANGLA_QR' || a.accountType === 'MERCHANT');
  const mobileBankingAccounts = activeAccounts.filter(a => ['BKASH', 'NAGAD', 'ROCKET', 'UPAY'].includes(a.provider));
  const cardAccounts = activeAccounts.filter(a => a.provider === 'BANK');

  // Fallback default list if database accounts are empty yet
  const displayedAccounts = activeTab === 'BANGLA_QR' 
    ? (banglaQrAccounts.length > 0 ? banglaQrAccounts : [{ provider: 'BANGLA_QR', accountType: 'MERCHANT', number: '10000001', name: 'MTB Bank Bangla QR' }])
    : activeTab === 'MOBILE'
    ? (mobileBankingAccounts.length > 0 ? mobileBankingAccounts : [
        { provider: 'BKASH', accountType: 'PERSONAL', number: '01800000000', name: 'bKash Send Money' },
        { provider: 'NAGAD', accountType: 'PERSONAL', number: '01800000000', name: 'Nagad Send Money' },
        { provider: 'ROCKET', accountType: 'PERSONAL', number: '01800000000', name: 'Rocket Send Money' },
        { provider: 'UPAY', accountType: 'PERSONAL', number: '01800000000', name: 'Upay Send Money' },
      ])
    : (cardAccounts.length > 0 ? cardAccounts : [{ provider: 'BANK', accountType: 'BANK', number: '10000001', name: 'Paystation / Bank Card' }]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 text-foreground py-8 px-4 flex flex-col items-center justify-center font-sans">
      <Toaster position="top-right" />

      {/* Main Container Card matching Epay / Paystation Portal design */}
      <div className="w-full max-w-xl space-y-5">

        {/* Top Header Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
          
          {/* Top Navbar Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-extrabold text-[16px] leading-snug">ZiniChat SaaS</h1>
                <p className="text-[11px] text-muted-foreground font-mono">Order: #{payment?.id?.slice(0, 10) || 'checkout'}</p>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block">Total Amount</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatBdtDirect(payment?.amountBdt || 0)}
              </span>
            </div>
          </div>

          {/* Category Navigation Tabs (Mobile Banking | Bangla QR [Default] | Card) */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-850">
            <button
              onClick={() => setActiveTab('MOBILE')}
              className={`py-3 px-2 rounded-xl text-[12px] font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
                activeTab === 'MOBILE'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-md border-2 border-emerald-600 dark:border-emerald-500'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Mobile Banking</span>
            </button>

            {/* Default & Highlighted Bangla QR */}
            <button
              onClick={() => setActiveTab('BANGLA_QR')}
              className={`py-3 px-2 rounded-xl text-[12px] font-bold transition-all flex flex-col items-center justify-center gap-1.5 relative ${
                activeTab === 'BANGLA_QR'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-md border-2 border-emerald-600 dark:border-emerald-500'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              <span className="absolute -top-2 bg-emerald-600 text-white text-[9px] px-2 py-0.2 rounded-full uppercase font-black tracking-wider shadow">
                Recommended
              </span>
              <QrCode className="w-4 h-4" />
              <span>Bangla QR</span>
            </button>

            <button
              onClick={() => setActiveTab('CARD')}
              className={`py-3 px-2 rounded-xl text-[12px] font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
                activeTab === 'CARD'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-md border-2 border-emerald-600 dark:border-emerald-500'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Card / Bank</span>
            </button>
          </div>

          {/* Provider Grid Selection */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Select Payment Option
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {displayedAccounts.map((acc: any, idx: number) => {
                const isMerchant = acc.accountType === 'MERCHANT' || acc.provider === 'BANGLA_QR';
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAccount(acc)}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-lg transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-border flex items-center justify-center shrink-0">
                        {acc.provider === 'BKASH' ? (
                          <span className="font-black text-[#e2136e] text-xs">bKash</span>
                        ) : acc.provider === 'NAGAD' ? (
                          <span className="font-black text-orange-500 text-xs">Nagad</span>
                        ) : acc.provider === 'ROCKET' ? (
                          <span className="font-black text-purple-500 text-xs">Rocket</span>
                        ) : (
                          <QrCode className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-[13px] group-hover:text-emerald-600 transition-colors">
                          {acc.name || acc.provider}
                        </h4>
                        <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                          {isMerchant ? 'Merchant QR / Bangla QR' : `${acc.accountType || 'Personal'} Send Money`}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coupon Input Drawer */}
          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
            <label className="text-[11px] font-semibold text-muted-foreground block">
              {language === 'en' ? 'Have a Coupon Code?' : 'কুপন কোড আছে?'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. PROMO20"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                disabled={applyingCoupon || !!appliedCoupon}
                className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[12px] font-mono focus:outline-none focus:border-emerald-500 uppercase"
              />
              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponInput('');
                    initiatePaymentInvoice();
                  }}
                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 rounded-xl text-[11px] font-bold transition-all"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCouponClick}
                  disabled={applyingCoupon || !couponInput.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[11px] font-bold hover:bg-emerald-500 transition-all disabled:opacity-50"
                >
                  {applyingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                </button>
              )}
            </div>
            {appliedCoupon && (
              <span className="text-[11px] text-emerald-500 font-bold block">
                ✓ Coupon {appliedCoupon.code} applied!
              </span>
            )}
          </div>

          {/* Footer Contact Support Button */}
          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex justify-between items-center text-[11px]">
            <span className="text-muted-foreground">
              {language === 'en' ? 'Having payment issues?' : 'পেমেন্ট নিয়ে কোনো সমস্যা হচ্ছে?'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('open-support-widget', {
                  detail: { message: language === 'en' ? 'I am having an issue with my payment.' : 'আমার পেমেন্ট করতে সমস্যা হচ্ছে।' }
                }));
              }}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {language === 'en' ? 'Contact Support' : 'সাপোর্ট টিমের সাথে যোগাযোগ করুন'}
            </button>
          </div>

        </div>

      </div>

      {/* Payment Drawer Modal matching professional checkout view */}
      {showPaymentModal && selectedAccount && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[15px]">
                  Pay with {selectedAccount.name || selectedAccount.provider}
                </span>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Amount Badge in Modal */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl text-center space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                {language === 'en' ? 'Exact Amount to Pay' : 'পরিশোধের সর্বমোট পরিমাণ'}
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatBdtDirect(qrPayload?.amount || payment?.amountBdt || 0)}
              </span>
            </div>

            {/* Timer Banner */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[12px] font-bold">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Time Remaining
              </span>
              <span className="font-mono text-sm">{formatTime(timeLeft)}</span>
            </div>

            {/* QR Code / Payment Instructions */}
            <div className="text-center space-y-3">
              {qrPayload ? (
                <>
                  {/* Dynamic or Uploaded QR Code */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 inline-block shadow-inner">
                    <img 
                      src={
                        qrPayload.qrCodeUrl || 
                        (qrPayload.qrCodeData?.startsWith('http') || qrPayload.qrCodeData?.startsWith('/') 
                          ? qrPayload.qrCodeData 
                          : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrPayload.qrCodeData || selectedAccount.number)}`)
                      } 
                      alt="Payment QR Code"
                      className="w-48 h-48 mx-auto object-contain"
                    />
                  </div>

                  <div className="text-[13px] font-bold text-muted-foreground">
                    <span>Open App → Scan QR → Confirm</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-zinc-950 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Send to Number ({selectedAccount.accountType || 'MERCHANT'})
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400">
                        {qrPayload.number || selectedAccount.number}
                      </span>
                      <button
                        onClick={() => handleCopy(qrPayload.number || selectedAccount.number, 'num')}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-colors text-muted-foreground"
                      >
                        {copiedField === 'num' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  <span className="text-[12px] text-muted-foreground">Generating QR Payload...</span>
                </div>
              )}
            </div>

            {/* Real-time Loader & Manual TrxID Input */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-center gap-2 text-[12px] text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Waiting for your payment...</span>
              </div>

              {showTrxField ? (
                <div className="space-y-2 pt-2">
                  <input
                    type="text"
                    placeholder="Enter TrxID or Last 4 Digits"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[13px] font-mono font-bold text-center uppercase"
                  />
                  <button
                    onClick={handleManualVerify}
                    disabled={verifying || !trxId.trim()}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all text-[12px] flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Verify Payment</span>
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowTrxField(true)}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline transition-all font-medium"
                  >
                    Or enter TrxID / Last 4 Digits manually
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default function PayMfsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-zinc-950 text-foreground flex-col gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="text-[12px] text-muted-foreground">Loading payment portal...</span>
      </div>
    }>
      <PayMfsContent />
    </Suspense>
  );
}
