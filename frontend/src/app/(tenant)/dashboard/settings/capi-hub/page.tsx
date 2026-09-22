'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { Activity, ShieldCheck, HelpCircle, Save, Globe, Info, RefreshCw, Zap, Server, Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRolloutFlag } from '@/hooks/useRolloutFlag';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CapiHubPage() {
  const { language } = useLanguage();
  const { enabled: isFeatureEnabled, loading: isFeatureLoading } = useRolloutFlag('capi_hub');
  
  const [integration, setIntegration] = useState<any>(null);
  const [eventConfigs, setEventConfigs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    pixelId: '',
    datasetId: '',
    accessToken: '',
    testEventCode: ''
  });

  useEffect(() => {
    if (isFeatureLoading || !isFeatureEnabled) {
      if (!isFeatureLoading) setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const token = Cookies.get('access_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [intRes, configsRes, logsRes] = await Promise.all([
          fetch(`${API}/capi-hub/integration`, { headers }),
          fetch(`${API}/capi-hub/event-configs`, { headers }),
          fetch(`${API}/capi-hub/logs`, { headers })
        ]);

        if (intRes.ok) {
          const data = await intRes.json();
          setIntegration(data);
          if (data) {
            setFormData({
              pixelId: data.pixelId || '',
              datasetId: data.datasetId || '',
              accessToken: data.accessToken ? '********' : '',
              testEventCode: data.testEventCode || ''
            });
          }
        }
        
        if (configsRes.ok) {
          setEventConfigs(await configsRes.json());
        }
        
        if (logsRes.ok) {
          setLogs(await logsRes.json());
        }
      } catch (err) {
        toast.error('Failed to load CAPI Hub data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isFeatureEnabled, isFeatureLoading]);

  const handleSaveIntegration = async () => {
    if (!formData.pixelId || !formData.accessToken) {
      toast.error(language === 'en' ? 'Pixel ID and Access Token are required' : 'Pixel ID এবং Access Token আবশ্যক');
      return;
    }

    setSaving(true);
    try {
      const token = Cookies.get('access_token');
      const payload: any = {
        pixelId: formData.pixelId,
        testEventCode: formData.testEventCode
      };
      
      if (formData.datasetId) payload.datasetId = formData.datasetId;
      if (formData.accessToken !== '********') payload.accessToken = formData.accessToken;

      const res = await fetch(`${API}/capi-hub/integration`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setIntegration(data);
        toast.success(language === 'en' ? 'Integration saved successfully' : 'ইন্টিগ্রেশন সফলভাবে সেভ হয়েছে');
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving integration');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEventConfig = async (eventName: string, field: string, value: boolean) => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/capi-hub/event-configs/${eventName}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [field]: value })
      });

      if (res.ok) {
        const updated = await res.json();
        setEventConfigs(prev => prev.map(c => c.eventName === eventName ? updated : c));
        toast.success(language === 'en' ? 'Event config updated' : 'ইভেন্ট কনফিগ আপডেট হয়েছে');
      }
    } catch (err) {
      toast.error('Error updating config');
    }
  };

  if (isFeatureLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-4 animate-pulse">
        <div className="h-32 bg-surface-hover/50 rounded-2xl" />
        <div className="h-64 bg-surface-hover/50 rounded-2xl" />
      </div>
    );
  }

  if (!isFeatureEnabled) {
    return (
      <div className="max-w-6xl mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-surface-hover/50 rounded-full flex items-center justify-center mb-6">
          <ShieldCheck className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Feature Locked</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          {language === 'en' 
            ? 'CAPI Hub is not available on your current plan. Please upgrade to unlock server-side tracking.'
            : 'আপনার বর্তমান প্ল্যানে CAPI Hub উপলব্ধ নেই। সার্ভার-সাইড ট্র্যাকিং পেতে প্ল্যান আপগ্রেড করুন।'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-2 sm:p-4 pb-20 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 shadow-sm">
        <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Server className="w-6 h-6 text-primary shrink-0" />
          {language === 'en' ? 'CAPI Hub (Server-Side Tracking)' : 'CAPI Hub (সার্ভার-সাইড ট্র্যাকিং)'}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-2">
          {language === 'en' 
            ? 'Server-Side Tracking sends conversion data directly from ZiniChat\'s server to Meta — more accurate than browser pixels, works even with ad blockers.'
            : 'সার্ভার-সাইড ট্র্যাকিং সরাসরি ZiniChat সার্ভার থেকে Meta-তে কনভার্সন ডেটা পাঠায় — ব্রাউজার পিক্সেলের চেয়ে নির্ভুল, অ্যাড ব্লকার থাকলেও কাজ করে।'}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left Column: Pixel Setup & Webhook */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5">
            <h2 className="text-[15px] font-bold flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-primary" />
              {language === 'en' ? 'Meta Pixel Setup' : 'মেটা পিক্সেল সেটআপ'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-bold text-muted-foreground mb-1 block">
                  Pixel ID <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={formData.pixelId}
                  onChange={e => setFormData({...formData, pixelId: e.target.value})}
                  className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-[13px]"
                  placeholder="e.g. 1234567890"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-muted-foreground mb-1 flex items-center gap-1">
                  Access Token <span className="text-red-500">*</span>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-foreground text-background text-[11px] rounded shadow-xl z-10 text-center">
                      Generate this in Events Manager {'>'} Settings {'>'} Conversions API
                    </div>
                  </div>
                </label>
                <input 
                  type="password" 
                  value={formData.accessToken}
                  onChange={e => setFormData({...formData, accessToken: e.target.value})}
                  className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-[13px]"
                  placeholder="EAA..."
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-muted-foreground mb-1 block">
                  Test Event Code (Optional)
                </label>
                <input 
                  type="text" 
                  value={formData.testEventCode}
                  onChange={e => setFormData({...formData, testEventCode: e.target.value})}
                  className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-[13px]"
                  placeholder="TEST12345"
                />
              </div>

              <button 
                onClick={handleSaveIntegration}
                disabled={saving}
                className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-[13px] font-bold transition-all flex justify-center items-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {language === 'en' ? 'Save Connection' : 'কানেকশন সেভ করুন'}
              </button>
            </div>
          </div>

          {integration && (
            <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5">
              <h2 className="text-[15px] font-bold flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-secondary" />
                {language === 'en' ? 'External Webhook' : 'এক্সটার্নাল ওয়েবহুক'}
              </h2>
              <p className="text-[11px] text-muted-foreground mb-4">
                {language === 'en' 
                  ? 'Send custom events from your website to ZiniChat using this webhook URL.'
                  : 'আপনার ওয়েবসাইট থেকে ZiniChat-এ কাস্টম ইভেন্ট পাঠাতে এই ওয়েবহুক URL ব্যবহার করুন।'}
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">Webhook URL</label>
                  <div className="bg-background border border-surface-hover rounded-lg p-2 text-[11px] break-all font-mono text-primary">
                    {`${API}/capi-hub/webhook/${integration.webhookToken}`}
                  </div>
                </div>
                
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Secret Key (Header: x-zinichat-secret)
                  </label>
                  <div className="bg-background border border-surface-hover rounded-lg p-2 text-[11px] break-all font-mono">
                    {integration.unhashedWebhookSecret || '******** (Hidden after creation)'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Event Configs & Logs */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-surface-hover flex justify-between items-center bg-surface-hover/10">
              <h2 className="text-[15px] font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                {language === 'en' ? 'Event Configurations' : 'ইভেন্ট কনফিগারেশন'}
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-surface-hover/30 text-[11px] text-muted-foreground uppercase">
                  <tr>
                    <th className="p-4 font-bold">Event Name</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold">Inbox AI</th>
                    <th className="p-4 font-bold">Order</th>
                    <th className="p-4 font-bold">Lead</th>
                    <th className="p-4 font-bold">Widget</th>
                    <th className="p-4 font-bold">Webhook</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {eventConfigs.map(config => (
                    <tr key={config.id} className="hover:bg-surface-hover/10">
                      <td className="p-4 font-bold">{config.eventName}</td>
                      <td className="p-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={config.isEnabled} onChange={(e) => handleToggleEventConfig(config.eventName, 'isEnabled', e.target.checked)} />
                          <div className="w-9 h-5 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </td>
                      <td className="p-4">
                        <input type="checkbox" checked={config.sourceInboxAiIntent} onChange={(e) => handleToggleEventConfig(config.eventName, 'sourceInboxAiIntent', e.target.checked)} className="rounded border-surface-hover bg-background text-primary" />
                      </td>
                      <td className="p-4">
                        <input type="checkbox" checked={config.sourceOrderCompleted} onChange={(e) => handleToggleEventConfig(config.eventName, 'sourceOrderCompleted', e.target.checked)} className="rounded border-surface-hover bg-background text-primary" />
                      </td>
                      <td className="p-4">
                        <input type="checkbox" checked={config.sourceLeadCreated} onChange={(e) => handleToggleEventConfig(config.eventName, 'sourceLeadCreated', e.target.checked)} className="rounded border-surface-hover bg-background text-primary" />
                      </td>
                      <td className="p-4">
                        <input type="checkbox" checked={config.sourceWidgetForm} onChange={(e) => handleToggleEventConfig(config.eventName, 'sourceWidgetForm', e.target.checked)} className="rounded border-surface-hover bg-background text-primary" />
                      </td>
                      <td className="p-4">
                        <input type="checkbox" checked={config.sourceExternalWebhook} onChange={(e) => handleToggleEventConfig(config.eventName, 'sourceExternalWebhook', e.target.checked)} className="rounded border-surface-hover bg-background text-primary" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl overflow-hidden">
             <div className="p-5 border-b border-surface-hover flex justify-between items-center bg-surface-hover/10">
              <h2 className="text-[15px] font-bold flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                {language === 'en' ? 'Recent Event Logs' : 'সাম্প্রতিক ইভেন্ট লগস'}
              </h2>
            </div>
            
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-surface-hover/30 text-[11px] text-muted-foreground uppercase sticky top-0 z-10">
                  <tr>
                    <th className="p-3 font-bold">Time</th>
                    <th className="p-3 font-bold">Event</th>
                    <th className="p-3 font-bold">Source</th>
                    <th className="p-3 font-bold">Status</th>
                    <th className="p-3 font-bold">Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground text-[12px]">
                        {language === 'en' ? 'No recent events' : 'কোনো সাম্প্রতিক ইভেন্ট নেই'}
                      </td>
                    </tr>
                  ) : logs.map(log => (
                    <tr key={log.id} className="hover:bg-surface-hover/10">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 font-bold text-foreground">{log.eventName}</td>
                      <td className="p-3 text-muted-foreground">{log.source}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500' :
                          log.status === 'suppressed_duplicate' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground max-w-[150px] truncate" title={log.errorMessage || log.responseCode?.toString()}>
                        {log.responseCode || log.errorMessage || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
