'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export default function PaymentSettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/payments/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      // Set demo default if no instructions saved yet
      if (!data.manualInstructions) {
        data.manualInstructions = `📲 bKash-এ পেমেন্ট করুন:\n\nবিকাশ নম্বর: 01712-345678 (Personal)\n\n১. আপনার বিকাশ অ্যাপ খুলুন\n২. "Send Money" বা "পাঠান" সিলেক্ট করুন\n৩. উপরের নম্বরে নির্ধারিত পরিমাণ টাকা পাঠান\n৪. TrxID (Transaction ID) কপি করুন\n৫. নিচের ফর্মে TrxID পেস্ট করে সাবমিট করুন\n\n⏱ পেমেন্ট ভেরিফিকেশনে সাধারণত ১-২ কার্যদিবস সময় লাগে।\n\nযেকোনো সমস্যায় যোগাযোগ করুন: support@yourplatform.com`;
      }
      setConfig(data);
    } catch (error) {
      setMsg('Failed to load payment config');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/payments/admin/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setMsg('✅ Payment settings saved successfully!');
      } else {
        setMsg('❌ Failed to save settings.');
      }
    } catch (error) {
      setMsg('❌ Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-2.5 text-zinc-400">Loading...</div>;

  return (
    <div className="p-2.5 space-y-3 max-w-3xl">
      <div>
        <h1 className="text-[13px] font-bold">Payment Gateways</h1>
        <p className="text-[12px] text-zinc-400 mt-1">Configure manual and automated payment methods.</p>
      </div>

      <div className="bg-surface border border-zinc-800 rounded-xl p-3 space-y-3">
        {/* Sandbox Mode */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">bKash Sandbox Mode</h3>
            <p className="text-[12px] text-zinc-400">Enable automated Sandbox payment simulation for testing.</p>
          </div>
          <button
            onClick={() => setConfig({ ...config, isSandboxEnabled: !config?.isSandboxEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config?.isSandboxEnabled ? 'bg-primary' : 'bg-zinc-700'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config?.isSandboxEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="h-px bg-zinc-800 w-full" />

        {/* Manual Payment */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Manual Payment (TrxID)</h3>
            <p className="text-[12px] text-zinc-400">Allow users to pay manually and submit a Transaction ID.</p>
          </div>
          <button
            onClick={() => setConfig({ ...config, isManualEnabled: !config?.isManualEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config?.isManualEnabled ? 'bg-primary' : 'bg-zinc-700'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config?.isManualEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {config?.isManualEnabled && (
          <div className="space-y-2 pt-4">
            <div>
              <label className="block text-[12px] font-medium text-zinc-300 mb-1">
                Payment Instructions
              </label>
              <textarea
                value={config.manualInstructions || ''}
                onChange={(e) => setConfig({ ...config, manualInstructions: e.target.value })}
                placeholder="e.g., Please send bKash to 017XXXXXX and enter the TrxID below."
                rows={4}
                className="w-full bg-background border border-zinc-800 rounded-lg px-2.5 py-2 text-[12px] focus:outline-none focus:border-primary resize-none"
              />
              <p className="text-xs text-zinc-500 mt-2">This will be shown to the tenant on the checkout page.</p>
            </div>
          </div>
        )}

        {msg && (
          <p className="text-[12px] text-center">{msg}</p>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 bg-primary text-black font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
