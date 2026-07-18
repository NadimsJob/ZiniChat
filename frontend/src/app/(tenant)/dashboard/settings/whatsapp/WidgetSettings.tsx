import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { Copy, Code, CheckCircle2, Lock } from 'lucide-react';

export default function WidgetSettings({ connections }: { connections: any[] }) {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [hasFeature, setHasFeature] = useState<boolean | null>(null);
  const [tenantId, setTenantId] = useState<string>('');
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const token = Cookies.get('access_token');
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          // Decode URL-safe base64 and parse JSON safely
          let base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
          const pad = base64.length % 4;
          if (pad) {
            base64 += new Array(5 - pad).join('=');
          }
          const decoded = JSON.parse(atob(base64));
          setTenantId(decoded.tenantId || decoded.sub || '');
        }
      } catch(e) {
        console.error('Failed to parse token', e);
      }
      fetchPlanFeatures(token);
    } else {
      setHasFeature(false);
    }
  }, []);

  const fetchAvailablePlans = async () => {
    try {
      const res = await fetch(`${API_URL}/packages/plans`);
      if (res.ok) {
        const data = await res.json();
        const widgetPlans = data.filter((p: any) => {
          let features = p.featuresJson || p.features || [];
          if (typeof features === 'string') {
             try { features = JSON.parse(features); } catch(e) {}
          }
          return Array.isArray(features) && features.includes('whatsapp_widget');
        });
        setAvailablePlans(widgetPlans);
      }
    } catch(err) {
      console.error('Failed to fetch plans', err);
    }
  };

  const fetchPlanFeatures = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        let features = data.tenant?.plan?.features || [];
        if (typeof features === 'string') {
          try { features = JSON.parse(features); } catch (e) { features = []; }
        }
        if (Array.isArray(features)) {
          const hasIt = features.includes('whatsapp_widget');
          setHasFeature(hasIt);
          if (!hasIt) fetchAvailablePlans();
        } else {
          setHasFeature(false);
          fetchAvailablePlans();
        }
      } else {
        setHasFeature(false);
        fetchAvailablePlans();
      }
    } catch(err) {
      setHasFeature(false);
      fetchAvailablePlans();
    }
  };
  
  const scriptCode = `<script src="${API_URL}/widget/whatsapp/${tenantId}/script.js"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (hasFeature === null) {
    return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading widget settings...</div>;
  }

  if (hasFeature === false) {
    return (
      <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          {language === 'en' ? 'Premium Feature Locked' : 'প্রিমিয়াম ফিচারটি লক করা আছে'}
        </h3>
        <p className="text-[13px] text-zinc-500 max-w-md mx-auto mb-6">
          {language === 'en' 
            ? 'The WhatsApp Website Widget is only available on select premium plans. Upgrade to one of the plans below to unlock this powerful lead generation tool.' 
            : 'হোয়াটসঅ্যাপ ওয়েবসাইট উইজেট ফিচারটি শুধুমাত্র স্পেসিফিক প্রিমিয়াম প্ল্যানে উপলব্ধ। এই ফিচারটি আনলক করতে নিচের যেকোনো একটি প্ল্যানে আপগ্রেড করুন।'}
        </p>
        
        {availablePlans.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto mb-4">
            {availablePlans.map((plan: any) => (
              <div key={plan.id} className="p-4 bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <h4 className="font-bold text-slate-900 dark:text-white text-[15px]">{plan.name}</h4>
                <div className="text-primary font-black text-xl my-2">৳{plan.monthlyPrice} <span className="text-xs text-zinc-500 font-normal">/mo</span></div>
                <a href="/dashboard/settings/subscription" className="mt-2 w-full px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded-lg transition-colors text-[13px]">
                  {language === 'en' ? 'Select Plan' : 'প্ল্যানটি নির্বাচন করুন'}
                </a>
              </div>
            ))}
          </div>
        )}
        
        {availablePlans.length === 0 && (
          <a href="/dashboard/settings/subscription" className="px-6 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25">
            {language === 'en' ? 'Upgrade Plan' : 'প্ল্যান আপগ্রেড করুন'}
          </a>
        )}
      </div>
    );
  }

  const activeConnection = connections.find(c => c.status === 'active');

  return (
    <div className="p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300 bg-white dark:bg-[#121214]">
      <div className="flex items-start gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="w-12 h-12 bg-green-100 dark:bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center shrink-0">
          <Code className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {language === 'en' ? 'Website Chat Widget' : 'ওয়েবসাইট চ্যাট উইজেট'}
          </h2>
          <p className="text-[13px] text-zinc-500 mt-1">
            {language === 'en' 
              ? 'Embed a floating WhatsApp button on your website. Customers can click it to chat directly with your connected number.'
              : 'আপনার ওয়েবসাইটে একটি হোয়াটসঅ্যাপ ফ্লোটিং বাটন যুক্ত করুন। কাস্টমাররা এটিতে ক্লিক করে সরাসরি মেসেজ করতে পারবে।'}
          </p>
        </div>
      </div>

      {!activeConnection ? (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-400 p-4 rounded-xl text-[13px] font-medium">
          {language === 'en' 
            ? '⚠️ Please connect at least one WhatsApp number first to use the widget.'
            : '⚠️ উইজেট ব্যবহার করতে অনুগ্রহ করে প্রথমে একটি হোয়াটসঅ্যাপ নম্বর কানেক্ট করুন।'}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-xl">
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
              {language === 'en' ? '1. Copy your embed code' : '১. আপনার এম্বেড কোডটি কপি করুন'}
            </label>
            <p className="text-[13px] text-zinc-500 mb-4">
              {language === 'en' 
                ? 'Paste this snippet just before the closing </body> tag of your website.'
                : 'আপনার ওয়েবসাইটের </body> ট্যাগ শেষ হওয়ার ঠিক আগে এই কোডটি পেস্ট করুন।'}
            </p>
            
            <div className="relative group">
              <pre className="bg-slate-900 dark:bg-black text-green-400 p-4 rounded-lg text-sm overflow-x-auto border border-slate-800 dark:border-zinc-800 font-mono">
                {scriptCode}
              </pre>
              <button 
                onClick={handleCopy}
                className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors backdrop-blur-sm"
                title="Copy code"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="mt-4 flex items-center gap-2 text-[13px] font-medium text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              {language === 'en' 
                ? `Linked to: ${activeConnection.displayName || activeConnection.phoneNumber}`
                : `লিঙ্ক করা নম্বর: ${activeConnection.displayName || activeConnection.phoneNumber}`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
