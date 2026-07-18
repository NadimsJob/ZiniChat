'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import { Crown, Package, Puzzle, Check } from 'lucide-react';

export default function SubscriptionSettingsPage() {
  const { language } = useLanguage();
  const { formatBDT, formatNumber } = useCurrency();
  
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Payment states
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [trxId, setTrxId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        const token = Cookies.get('access_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // Fetch public active plans & addons
        const [plansRes, addonsRes, mySubRes, configRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/plans`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/addons`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/billing/subscriptions`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/payments/config`, { headers })
        ]);
        
        if (plansRes.ok) setPlans(await plansRes.json());
        if (addonsRes.ok) setAddons(await addonsRes.json());
        if (mySubRes.ok) {
          const subs = await mySubRes.json();
          if (subs && subs.length > 0) setCurrentSubscription(subs[0]);
        }
        if (configRes.ok) {
          setPaymentConfig(await configRes.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscriptionData();
  }, []);

  const handleSubscribe = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    setSelectedPlan(plan);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/payments/validate-coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify({ code: couponCode, planId: selectedPlan?.id })
      });
      if (res.ok) {
        const data = await res.json();
        setAppliedCoupon(data);
        setCouponError('');
      } else {
        const errData = await res.json();
        setCouponError(errData.message || 'Invalid coupon');
        setAppliedCoupon(null);
      }
    } catch (err) {
      setCouponError('Error validating coupon');
    }
  };

  const calculateFinalPrice = () => {
    if (!selectedPlan) return 0;
    let price = billingCycle === 'yearly' ? selectedPlan.priceYearlyBdt : selectedPlan.priceMonthlyBdt;
    if (appliedCoupon) {
      if (appliedCoupon.discountType === 'percentage') {
        price = price - (price * appliedCoupon.discountValue / 100);
      } else {
        price = price - appliedCoupon.discountValue;
      }
    }
    return price > 0 ? price : 0;
  };

  const handleManualPayment = async () => {
    if (!selectedPlan || !trxId) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/payments/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify({ 
          planId: selectedPlan.id, 
          trxId, 
          billingCycle,
          couponCode: appliedCoupon?.code 
        })
      });
      if (res.ok) {
        alert(language === 'en' ? 'Payment submitted and pending approval.' : 'পেমেন্ট সাবমিট করা হয়েছে এবং অনুমোদনের অপেক্ষায় আছে।');
        setSelectedPlan(null);
        setTrxId('');
      } else {
        alert('Failed to submit payment');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSandboxPayment = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/payments/sandbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify({ 
          planId: selectedPlan.id, 
          billingCycle,
          couponCode: appliedCoupon?.code 
        })
      });
      if (res.ok) {
        alert(language === 'en' ? 'Payment successful! Subscription active.' : 'পেমেন্ট সফল! সাবস্ক্রিপশন চালু হয়েছে।');
        setSelectedPlan(null);
        window.location.reload();
      } else {
        alert('Failed to process sandbox payment');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuyAddon = async (addonId: string) => {
    if (!confirm(language === 'en' ? 'Proceed to payment?' : 'পেমেন্ট এর জন্য এগিয়ে যাবেন?')) return;
    alert('Payment Gateway Integration Required');
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading subscription details...</div>;
  }

  return (
    <div className="bg-white/70 dark:bg-[#0f0f11]/80 backdrop-blur-xl border border-white/50 dark:border-zinc-800/80 rounded-2xl p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] max-w-4xl mx-auto space-y-4 animate-in fade-in duration-500 pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-1.5">
          <Crown className="w-8 h-8 text-yellow-500" />
          {language === 'en' ? 'Subscription & Add-ons' : 'সাবস্ক্রিপশন এবং অ্যাড-অন'}
        </h1>
        <p className="text-zinc-400 mt-2">
          {language === 'en' ? 'Manage your current plan and purchase extra limits.' : 'আপনার বর্তমান প্ল্যান পরিচালনা করুন এবং অতিরিক্ত লিমিট কিনুন।'}
        </p>
      </div>

      {/* Current Subscription Status */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold text-primary uppercase tracking-wider">
            {language === 'en' ? 'Current Plan' : 'বর্তমান প্ল্যান'}
          </h2>
          <div className="text-3xl font-black mt-1">
            {currentSubscription ? currentSubscription.plan?.name : (language === 'en' ? 'Free Tier' : 'ফ্রি টায়ার')}
          </div>
          {currentSubscription && (
            <p className="text-[13px] text-zinc-400 mt-2">
              {language === 'en' ? 'Renews on:' : 'রিনিউ হবে:'} {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-1.5">
          {currentSubscription?.status === 'past_due' && (
            <button className="px-1.5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium shadow-lg shadow-red-500/20 transition-colors">
              {language === 'en' ? 'Pay Due Amount' : 'বকেয়া পরিশোধ করুন'}
            </button>
          )}
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-zinc-400" />
            {language === 'en' ? 'Upgrade Plan' : 'প্ল্যান আপগ্রেড করুন'}
          </h2>
          
          <div className="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 flex">
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-zinc-500 hover:text-foreground'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-zinc-500 hover:text-foreground'}`}
            >
              Yearly <span className="text-[10px] bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full">Save ~20%</span>
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map(plan => (
            <div key={plan.id} className={`bg-surface border rounded-2xl p-1.5 flex flex-col ${currentSubscription?.planId === plan.id ? 'border-primary ring-1 ring-primary' : 'border-surface-hover'}`}>
              {currentSubscription?.planId === plan.id && (
                <div className="text-[11px] font-bold text-primary mb-1 uppercase tracking-wider">Active Plan</div>
              )}
              <h3 className="text-lg font-bold">{language === 'en' ? plan.name : (plan.nameBn || plan.name)}</h3>
              <div className="text-2xl font-black mt-1 text-primary">
                {formatBDT(billingCycle === 'yearly' ? plan.priceYearlyBdt : plan.priceMonthlyBdt)}
              </div>
              <div className="text-[13px] text-zinc-500 mb-3">/ {billingCycle}</div>
              
              <ul className="space-y-2 mb-4 flex-1">
                <li className="flex items-center gap-1.5 text-[13px] text-zinc-300">
                  <Check className="w-3.5 h-3.5 text-secondary" /> {formatNumber(plan.seatLimit)} {language === 'en' ? 'Team Members' : 'টিম মেম্বার'}
                </li>
                <li className="flex items-center gap-2 text-[13px] text-zinc-300">
                  <Check className="w-3.5 h-3.5 text-secondary" /> {formatNumber(plan.messageQuota)} {language === 'en' ? 'Messages/mo' : 'মেসেজ/মাস'}
                </li>
                <li className="flex items-center gap-2 text-[13px] text-zinc-300">
                  <Check className="w-3.5 h-3.5 text-secondary" /> {formatNumber(plan.aiQuota)} {language === 'en' ? 'AI Responses/mo' : 'এআই রেসপন্স/মাস'}
                </li>
                {Array.isArray(plan.features) && plan.features.map((feature: string) => {
                  const featureMap: Record<string, {en: string, bn: string}> = {
                    'ai_assistant': { en: 'AI Assistant', bn: 'এআই অ্যাসিস্ট্যান্ট' },
                    'own_api': { en: 'Bring Your Own Key', bn: 'নিজস্ব এপিআই কি' },
                    'messenger': { en: 'Messenger Integration', bn: 'মেসেঞ্জার ইন্টিগ্রেশন' },
                    'whatsapp': { en: 'WhatsApp Integration', bn: 'হোয়াটসঅ্যাপ ইন্টিগ্রেশন' },
                    'lead_manage': { en: 'Leads CRM', bn: 'লিডস সিআরএম' },
                    'commerce': { en: 'Products & Orders', bn: 'প্রোডাক্টস এবং অর্ডারস' }
                  };
                  const labels = featureMap[feature];
                  if (!labels) return null;
                  return (
                    <li key={feature} className="flex items-center gap-2 text-[13px] text-zinc-300">
                      <Check className="w-3.5 h-3.5 text-secondary" /> {language === 'en' ? labels.en : labels.bn}
                    </li>
                  );
                })}
              </ul>
              
              <button 
                onClick={() => handleSubscribe(plan.id)}
                disabled={currentSubscription?.planId === plan.id}
                className={`w-full py-1 rounded-lg font-medium transition-colors ${currentSubscription?.planId === plan.id ? 'bg-surface-hover text-zinc-500 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20'}`}
              >
                {currentSubscription?.planId === plan.id 
                  ? (language === 'en' ? 'Current Plan' : 'বর্তমান প্ল্যান')
                  : (language === 'en' ? 'Subscribe' : 'সাবস্ক্রাইব করুন')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Available Add-ons */}
      {addons.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-zinc-400" />
            {language === 'en' ? 'Available Add-ons' : 'অতিরিক্ত অ্যাড-অন'}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {addons.map(addon => (
              <div key={addon.id} className="bg-surface border border-surface-hover rounded-2xl p-3 flex flex-col hover:border-primary/50 transition-colors">
                <h3 className="text-[13px] font-bold">{language === 'en' ? addon.name : (addon.nameBn || addon.name)}</h3>
                <div className="text-xl font-black mt-1 text-primary">{formatBDT(addon.priceBdt)}</div>
                <div className="text-[11px] text-zinc-500 mb-3">{language === 'en' ? addon.description : (addon.descriptionBn || addon.description)}</div>
                
                <div className="space-y-1 mb-4 flex-1">
                  {addon.type === 'seat' && (
                    <div className="flex items-center gap-1.5 text-[12px] text-zinc-300">
                      <Check className="w-3 h-3 text-secondary" /> +{formatNumber(addon.limit)} {language === 'en' ? 'Team Members' : 'টিম মেম্বার'}
                    </div>
                  )}
                  {addon.type === 'message' && (
                    <div className="flex items-center gap-1.5 text-[12px] text-zinc-300">
                      <Check className="w-3 h-3 text-secondary" /> +{formatNumber(addon.limit)} {language === 'en' ? 'Messages/mo' : 'মেসেজ/মাস'}
                    </div>
                  )}
                  {addon.type === 'ai_response' && (
                    <div className="flex items-center gap-1.5 text-[12px] text-zinc-300">
                      <Check className="w-3 h-3 text-secondary" /> +{formatNumber(addon.limit)} {language === 'en' ? 'AI Responses' : 'এআই রেসপন্স'}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => handleBuyAddon(addon.id)}
                  className="w-full py-1 bg-surface-hover hover:bg-primary/20 hover:text-primary text-zinc-300 rounded-lg font-medium transition-colors text-[13px]"
                >
                  {language === 'en' ? 'Purchase' : 'কিনুন'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-1.5">
          <div className="bg-background border border-zinc-800 rounded-2xl w-full max-w-md p-1.5 animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">
              {language === 'en' ? 'Complete Payment' : 'পেমেন্ট সম্পন্ন করুন'}
            </h3>
            
            {!paymentConfig ? (
              <div className="text-center py-8">Loading payment methods...</div>
            ) : (
              <div className="space-y-6">
                
                {/* Coupon Section */}
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter Coupon Code" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-primary"
                  />
                  <button 
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[13px] font-medium transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-red-500 text-[12px]">{couponError}</p>}
                {appliedCoupon && <p className="text-green-500 text-[12px]">Coupon {appliedCoupon.code} applied successfully!</p>}

                <div className="p-1.5 bg-surface rounded-lg flex justify-between items-center">
                  <div>
                    <div className="text-[13px] text-zinc-400">Total Amount ({billingCycle})</div>
                    {appliedCoupon && (
                      <div className="text-[12px] text-zinc-500 line-through">
                        {formatBDT(billingCycle === 'yearly' ? selectedPlan.priceYearlyBdt : selectedPlan.priceMonthlyBdt)}
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-primary">{formatBDT(calculateFinalPrice())}</div>
                </div>

                {paymentConfig.isSandboxEnabled && (
                  <button
                    onClick={handleSandboxPayment}
                    disabled={isProcessing}
                    className="w-full py-1 bg-[#e2136e] hover:bg-[#e2136e]/90 text-white rounded-lg font-medium transition-colors"
                  >
                    {isProcessing ? 'Processing...' : (language === 'en' ? 'Pay with bKash (Sandbox)' : 'বিকাশ দিয়ে পেমেন্ট করুন (স্যান্ডবক্স)')}
                  </button>
                )}

                {paymentConfig.isManualEnabled && (
                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <p className="text-[13px] text-zinc-300 whitespace-pre-wrap">
                      {paymentConfig.manualInstructions || 'Please send money and enter TrxID below.'}
                    </p>
                    <input
                      type="text"
                      placeholder="Transaction ID (TrxID)"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      className="w-full bg-surface border border-zinc-800 rounded-lg px-1.5 py-2 focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleManualPayment}
                      disabled={isProcessing || !trxId}
                      className="w-full py-1 bg-primary hover:bg-primary/90 text-black rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? 'Submitting...' : (language === 'en' ? 'Submit TrxID' : 'TrxID সাবমিট করুন')}
                    </button>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={() => { setSelectedPlan(null); setTrxId(''); setCouponCode(''); setAppliedCoupon(null); }}
              className="mt-6 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
            >
              {language === 'en' ? 'Cancel' : 'বাতিল করুন'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

