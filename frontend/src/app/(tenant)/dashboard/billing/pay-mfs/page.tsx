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
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function PayMfsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const { formatBDT } = useCurrency();

  const planId = searchParams.get('planId');
  const billingCycle = searchParams.get('billingCycle') || 'monthly';
  const couponCode = searchParams.get('coupon') || '';

  const [payment, setPayment] = useState<any>(null);
  const [qrPayload, setQrPayload] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>(''); // 'BKASH', 'NAGAD', 'ROCKET', 'BANK'
  const [trxId, setTrxId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes countdown
  const [copiedField, setCopiedField] = useState<string>('');
  
  const timerRef = useRef<any>(null);
  const autoCheckRef = useRef<any>(null);

  // 1. Create the pending payment invoice on load
  useEffect(() => {
    if (!planId) {
      toast.error('Invalid plan selection');
      router.push('/dashboard/settings/subscription');
      return;
    }
    initiatePaymentInvoice();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoCheckRef.current) clearInterval(autoCheckRef.current);
    };
  }, [planId]);

  // Start timer when invoice is loaded
  useEffect(() => {
    if (payment) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            toast.error('Payment window expired. Please try again.');
            router.push('/dashboard/settings/subscription');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start real-time auto-checking in background every 5 seconds
      startAutoCheck();
    }
  }, [payment]);

  const initiatePaymentInvoice = async () => {
    try {
      const token = Cookies.get('access_token');
      // Create a manual pending payment request with a placeholder TrxID first
      const tempTrxId = `PENDING_${Date.now()}`;
      const res = await fetch(`${API}/payments/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planId,
          trxId: tempTrxId,
          billingCycle,
          couponCode: couponCode || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPayment(data);
        // Default select first available provider - we will fetch config next
        fetchPaymentConfig(data.id);
      } else {
        toast.error('Failed to initialize payment invoice');
      }
    } catch (err) {
      toast.error('Failed to connect to billing server');
    }
  };

  const fetchPaymentConfig = async (paymentId: string) => {
    try {
      const token = Cookies.get('access_token');
      // Try to get Bangla QR first, then bKash, or any available
      const providers = ['BANGLA_QR', 'BKASH', 'NAGAD', 'ROCKET', 'BANK'];
      for (const p of providers) {
        const res = await fetch(`${API}/mfs-payments/qr-payload/${paymentId}?provider=${p}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const payload = await res.json();
          setQrPayload(payload);
          setSelectedProvider(payload.provider);
          break;
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Change payment method during checkout
  const handleSelectProvider = async (provider: string) => {
    if (!payment) return;
    try {
      const token = Cookies.get('access_token');
      setSelectedProvider(provider);
      
      // Now query the QR payload for the selected provider
      const res = await fetch(`${API}/mfs-payments/qr-payload/${payment.id}?provider=${provider}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const payload = await res.json();
        setQrPayload({ ...payload, provider });
      } else {
        setQrPayload(null);
        toast.error(`Configuration not found for ${provider}`);
      }
    } catch (err) {
      toast.error('Error changing provider');
    }
  };

  const startAutoCheck = () => {
    if (autoCheckRef.current) clearInterval(autoCheckRef.current);
    autoCheckRef.current = setInterval(async () => {
      // If user has typed a trxId, we can background verify it
      if (trxId.length >= 8 && !verifying && !paymentSuccess) {
        silentVerify();
      }
    }, 6000);
  };

  const silentVerify = async () => {
    if (!payment || !trxId.trim()) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/mfs-payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentId: payment.id,
          trxId: trxId.trim()
        })
      });
      if (res.ok) {
        clearInterval(autoCheckRef.current);
        clearInterval(timerRef.current);
        setPaymentSuccess(true);
        toast.success('Payment verified successfully!');
      }
    } catch (e) {
      // Fail silently in background check
    }
  };

  const handleVerify = async () => {
    if (!payment || !trxId.trim()) {
      toast.error(language === 'en' ? 'Please enter Transaction ID' : 'অনুগ্রহ করে ট্রানজেকশন আইডি দিন');
      return;
    }
    setVerifying(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/mfs-payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentId: payment.id,
          trxId: trxId.trim()
        })
      });

      if (res.ok) {
        setPaymentSuccess(true);
        if (timerRef.current) clearInterval(timerRef.current);
        if (autoCheckRef.current) clearInterval(autoCheckRef.current);
        toast.success(language === 'en' ? 'Payment Verified!' : 'পেমেন্ট সফলভাবে ভেরিফাই করা হয়েছে!');
      } else {
        const err = await res.json();
        toast.error(err.message || 'Verification failed. Double check your TrxID.');
      }
    } catch (err) {
      toast.error('Connection error during verification');
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied!');
    setTimeout(() => setCopiedField(''), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (paymentSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-3 text-[13px]">
        <div className="bg-surface/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 w-full max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-950/40 border border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          
          <h2 className="text-xl font-bold text-emerald-400">
            {language === 'en' ? 'Payment Successful!' : 'পেমেন্ট সফল হয়েছে!'}
          </h2>
          <p className="text-zinc-400 text-[12px]">
            {language === 'en' 
              ? 'Your subscription is now active. You will be redirected to the dashboard in a few seconds.' 
              : 'আপনার সাবস্ক্রিপশন সচল হয়েছে। কিছুক্ষণের মধ্যে ড্যাশবোর্ডে রিডাইরেক্ট করা হবে।'}
          </p>
          
          <button
            onClick={() => {
              // Reload page to apply changes
              window.location.href = '/dashboard';
            }}
            className="w-full py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            {language === 'en' ? 'Go to Dashboard' : 'ড্যাশবোর্ডে ফিরে যান'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 max-w-4xl mx-auto text-[13px]">
      <Toaster position="top-right" />
      
      {/* Back Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (confirm(language === 'en' ? 'Cancel checkout?' : 'পেমেন্ট বাতিল করে ফিরে যাবেন?')) {
              router.push('/dashboard/settings/subscription');
            }
          }}
          className="p-1.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-bold text-[14px]">
            {language === 'en' ? 'Secure Payment Portal' : 'নিরাপদ পেমেন্ট গেটওয়ে'}
          </h1>
          <p className="text-[11px] text-zinc-500">
            {language === 'en' ? 'Select MFS or Bank to scan and pay.' : 'স্ক্যান ও পেমেন্ট করতে এমএফএস বা ব্যাংক নির্বাচন করুন।'}
          </p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Left column: MFS Selectors */}
        <div className="space-y-2 col-span-1">
          <h3 className="font-semibold text-zinc-400 px-1">
            {language === 'en' ? 'Select Payment Method' : 'পেমেন্ট মাধ্যম বেছে নিন'}
          </h3>
          
          <div className="space-y-2">
            {[
              { id: 'BANGLA_QR', name: 'Bangla QR (Universal)', color: 'hover:border-amber-500/50 amber-border', desc: language === 'en' ? 'Scan via any Bank or MFS app' : 'যেকোনো ব্যাংক বা বিকাশ/নগদ দিয়ে স্ক্যান করুন', isHighlight: true },
              { id: 'BKASH', name: 'bKash', color: 'hover:border-pink-500/50 pink-border', desc: 'Personal / Merchant' },
              { id: 'NAGAD', name: 'Nagad', color: 'hover:border-orange-500/50 orange-border', desc: 'Personal / Merchant' },
              { id: 'ROCKET', name: 'Rocket', color: 'hover:border-purple-500/50 purple-border', desc: 'Personal' },
              { id: 'BANK', name: 'Bank Transfer', color: 'hover:border-sky-500/50 sky-border', desc: 'NPSB / RTGS / Instant Transfer' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => handleSelectProvider(m.id)}
                className={`w-full text-left p-3 rounded-xl border backdrop-blur-xl transition-all relative overflow-hidden ${
                  selectedProvider === m.id 
                    ? (m.isHighlight 
                        ? 'bg-amber-500/5 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : 'bg-primary/10 border-primary shadow-[0_0_12px_rgba(31,130,74,0.1)]')
                    : (m.isHighlight
                        ? 'bg-zinc-950/20 border-amber-500/25 hover:border-amber-500/40 hover:bg-zinc-950/40'
                        : 'bg-surface/50 border-zinc-800/80 hover:bg-surface/75')
                }`}
              >
                {m.isHighlight && (
                  <span className="absolute top-0 right-0 bg-amber-500 text-black text-[8px] font-extrabold px-1.5 py-0.5 rounded-bl uppercase tracking-wider">
                    {language === 'en' ? 'Recommended' : 'সুপারিশকৃত'}
                  </span>
                )}
                <div className="flex justify-between items-center">
                  <span className={`font-bold ${m.isHighlight ? 'text-amber-400' : 'text-zinc-200'}`}>{m.name}</span>
                  {selectedProvider === m.id && <Check className={`w-4 h-4 ${m.isHighlight ? 'text-amber-500' : 'text-primary'}`} />}
                </div>
                <div className={`text-[10px] mt-0.5 ${m.isHighlight ? 'text-amber-500/60' : 'text-zinc-500'}`}>{m.desc}</div>
              </button>
            ))}
          </div>

          {/* Invoice Summary */}
          {payment && (
            <div className="bg-surface/40 border border-zinc-800 rounded-xl p-3 mt-3">
              <h4 className="font-bold text-[12px] text-zinc-400 mb-2 uppercase tracking-wider">
                {language === 'en' ? 'Invoice Summary' : 'ইনভয়েস সামারি'}
              </h4>
              <div className="space-y-1 text-[11px] text-zinc-400">
                <div className="flex justify-between">
                  <span>Billing Cycle:</span>
                  <span className="font-medium text-zinc-200 capitalize">{billingCycle}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-800/40 pt-1 mt-1 text-[13px] font-bold text-primary">
                  <span>Total Amount:</span>
                  <span>{formatBDT(payment.amountBdt)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: QR and Verification details */}
        <div className="col-span-2 space-y-3">
          {/* Main Payment card */}
          <div className="bg-surface/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-between text-center relative overflow-hidden">
            
            {/* Top timer */}
            <div className="absolute top-3 right-3 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px] font-mono px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            {qrPayload ? (
              <div className="w-full space-y-4">
                
                {/* QR Display */}
                <div>
                  <h3 className="font-bold text-zinc-200 mb-1">
                    {qrPayload.accountType === 'MERCHANT' || qrPayload.provider === 'BANGLA_QR' 
                      ? (language === 'en' ? 'Scan Bangla QR / Merchant QR' : 'বাংলা কিউআর / মার্চেন্ট কিউআর স্ক্যান করুন') 
                      : (language === 'en' ? 'Scan QR Code to Pay' : 'কিউআর কোড স্ক্যান করে পে করুন')}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {qrPayload.accountType === 'MERCHANT' 
                      ? (language === 'en' ? 'Open bKash/Nagad scan option' : 'বিকাশ/নগদ অ্যাপ দিয়ে স্ক্যান করুন')
                      : (language === 'en' ? 'Scan this code from your mobile banking app' : 'মোবাইল ব্যাংকিং অ্যাপ দিয়ে স্ক্যান করুন')}
                  </p>

                  <div className="bg-white p-2.5 rounded-xl inline-block mt-3 shadow-lg border border-zinc-200">
                    {/* Render dynamic Bangla QR or Static QR URL */}
                    <img 
                      src={
                        qrPayload.accountType === 'MERCHANT' || qrPayload.provider === 'BANGLA_QR'
                          ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload.qrCodeData)}`
                          : (qrPayload.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload.number)}`)
                      } 
                      alt="QR Code" 
                      className="w-44 h-44"
                    />
                  </div>
                </div>

                {/* Instructions / Account numbers */}
                <div className="bg-zinc-950/40 rounded-xl p-3 border border-zinc-800/40 text-left space-y-2.5 max-w-md mx-auto">
                  
                  {qrPayload.provider === 'BANK' ? (
                    <>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase font-semibold">Bank Name</span>
                          <div className="font-bold text-zinc-200 text-[12px]">{qrPayload.bankName}</div>
                        </div>
                      </div>
                      
                      <div className="h-px bg-zinc-800" />
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase font-semibold">Account Number</span>
                          <div className="font-bold text-zinc-200 text-[12px] font-mono">{qrPayload.number}</div>
                        </div>
                        <button 
                          onClick={() => handleCopy(qrPayload.number, 'num')}
                          className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-400"
                        >
                          {copiedField === 'num' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="h-px bg-zinc-800" />

                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase font-semibold">Routing Number</span>
                          <div className="font-bold text-zinc-200 text-[12px] font-mono">{qrPayload.routingNumber}</div>
                        </div>
                        <button 
                          onClick={() => handleCopy(qrPayload.routingNumber, 'rout')}
                          className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-400"
                        >
                          {copiedField === 'rout' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase font-semibold">Payment Type</span>
                          <div className="font-bold text-zinc-200 text-[12px] capitalize">
                            {qrPayload.accountType.toLowerCase()} ({qrPayload.provider.toLowerCase()})
                          </div>
                        </div>
                      </div>
                      
                      <div className="h-px bg-zinc-800" />

                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase font-semibold">Send To Number</span>
                          <div className="font-bold text-zinc-200 text-[12px] font-mono">{qrPayload.number}</div>
                        </div>
                        <button 
                          onClick={() => handleCopy(qrPayload.number, 'num')}
                          className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-400"
                        >
                          {copiedField === 'num' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </>
                  )}

                  <div className="h-px bg-zinc-800" />

                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold">Exact Amount</span>
                      <div className="font-bold text-primary text-[14px]">{formatBDT(payment.amountBdt)}</div>
                    </div>
                    <button 
                      onClick={() => handleCopy(payment.amountBdt.toString(), 'amt')}
                      className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-400"
                    >
                      {copiedField === 'amt' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Input verification form */}
                <div className="w-full max-w-md mx-auto pt-3 border-t border-zinc-800/40 space-y-2.5">
                  <div className="text-left">
                    <label className="block text-[11px] text-zinc-400 font-semibold mb-1 uppercase tracking-wider">
                      {qrPayload.provider === 'BANK' ? 'Transaction Reference / Trace ID' : 'MFS Transaction ID (TrxID)'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 8N7X2C9Y10"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      className="w-full bg-zinc-950/60 border border-zinc-850 rounded-xl px-3 py-2 text-[13px] font-bold text-zinc-200 focus:outline-none focus:border-primary text-center font-mono placeholder:font-sans uppercase"
                    />
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={verifying || !trxId.trim()}
                    className="w-full py-2 bg-primary text-black hover:bg-primary/95 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        Verifying Transaction...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-black" />
                        Verify and Activate Plan
                      </>
                    )}
                  </button>
                  
                  <p className="text-[10px] text-zinc-500">
                    * The system automatically scans your payment and updates in 5-10 seconds. You can also manually verify by clicking the button.
                  </p>
                </div>

              </div>
            ) : (
              <div className="py-20 text-zinc-500">
                <Landmark className="w-10 h-10 mx-auto mb-2 opacity-30 animate-pulse" />
                This payment method is not configured or offline. Please select another provider on the left.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function PayMfsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white flex-col gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-[12px] text-zinc-400">Loading payment secure portal...</span>
      </div>
    }>
      <PayMfsContent />
    </Suspense>
  );
}
