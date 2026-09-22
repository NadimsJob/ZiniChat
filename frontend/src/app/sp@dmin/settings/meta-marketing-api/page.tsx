'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { Save, AlertCircle, CheckCircle, Globe, Zap, List } from 'lucide-react';

export default function MetaMarketingApiPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; timestamp?: string } | null>(null);

  const [form, setForm] = useState({
    appId: '',
    appSecret: '',
    apiVersion: 'v21.0',
    systemUserToken: '',
    webhookVerifyToken: '',
    isEnabled: false,
    adRunUnitCost: 10,
    autoScaleUnitCost: 5,
  });

  const [tools, setTools] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchTools();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/meta-marketing-config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setForm({
          appId: data.appId || '',
          appSecret: data.appSecret || '',
          apiVersion: data.apiVersion || 'v21.0',
          systemUserToken: data.systemUserToken || '',
          webhookVerifyToken: data.webhookVerifyToken || '',
          isEnabled: data.isEnabled || false,
          adRunUnitCost: data.adRunUnitCost || 10,
          autoScaleUnitCost: data.autoScaleUnitCost || 5,
        });
        if (data.lastTestedAt) {
          setTestResult({
            success: data.lastTestStatus === 'success',
            message: data.lastTestMessage || '',
            timestamp: new Date(data.lastTestedAt).toLocaleString()
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTools = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/meta-marketing-config/tools`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTools(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/meta-marketing-config`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(form)
      });
      
      if (!res.ok) throw new Error('Failed to update settings');
      setStatus({ type: 'success', message: 'Settings saved successfully' });
      return true;
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'An error occurred' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Auto-save form settings before testing connection
      await handleSave();

      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/meta-marketing-config/test-connection`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message,
        timestamp: new Date().toLocaleString()
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to connect'
      });
    } finally {
      setTesting(false);
    }
  };

  const toggleTool = async (toolKey: string, isEnabled: boolean) => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/meta-marketing-config/tools`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ toolKey, isEnabled })
      });
      if (res.ok) {
        setTools(tools.map(t => t.toolKey === toolKey ? { ...t, isEnabled } : t));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-brand-green" />
            Meta Marketing API Configuration
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Configure system-wide Meta Marketing API credentials for MCP Ads Agent.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-4 py-2 bg-brand-green hover:bg-brand-green/90 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          <div className="flex items-center gap-3 bg-white dark:bg-surface/50 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-lg shadow-sm">
            <span className="text-sm font-medium text-slate-900 dark:text-white">Master Kill-Switch</span>
            <button
              onClick={() => setForm({ ...form, isEnabled: !form.isEnabled })}
              className={`w-12 h-6 rounded-full transition-colors relative ${form.isEnabled ? 'bg-brand-green' : 'bg-slate-300 dark:bg-surface-light border border-slate-300 dark:border-white/10'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.isEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSave} className="space-y-6 bg-white dark:bg-surface/70 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-brand-orange" />
            Core Configuration
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">App ID</label>
              <input
                type="text"
                value={form.appId}
                onChange={e => setForm({ ...form, appId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-surface-light border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-green"
                placeholder="Meta App ID"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">App Secret</label>
              <input
                type="password"
                value={form.appSecret}
                onChange={e => setForm({ ...form, appSecret: e.target.value })}
                className="w-full bg-slate-50 dark:bg-surface-light border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-green"
                placeholder="Leave blank to keep existing"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Graph API Version</label>
              <input
                type="text"
                value={form.apiVersion}
                onChange={e => setForm({ ...form, apiVersion: e.target.value })}
                className="w-full bg-slate-50 dark:bg-surface-light border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-green"
                placeholder="v21.0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">System User Token</label>
              <input
                type="password"
                value={form.systemUserToken}
                onChange={e => setForm({ ...form, systemUserToken: e.target.value })}
                className="w-full bg-slate-50 dark:bg-surface-light border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-green"
                placeholder="Leave blank to keep existing"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Webhook Verify Token</label>
              <input
                type="text"
                value={form.webhookVerifyToken}
                onChange={e => setForm({ ...form, webhookVerifyToken: e.target.value })}
                className="w-full bg-slate-50 dark:bg-surface-light border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-green"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Ad Run Unit Cost</label>
                <input
                  type="number"
                  value={form.adRunUnitCost}
                  onChange={e => setForm({ ...form, adRunUnitCost: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-50 dark:bg-surface-light border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-green"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Auto Scale Unit Cost</label>
                <input
                  type="number"
                  value={form.autoScaleUnitCost}
                  onChange={e => setForm({ ...form, autoScaleUnitCost: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-50 dark:bg-surface-light border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-green"
                />
              </div>
            </div>
          </div>

          {status && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'}`}>
              {status.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {status.message}
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-brand-green hover:bg-brand-green/90 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !form.appId}
              className="px-4 py-2 bg-slate-100 dark:bg-surface-light border border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 text-slate-900 dark:text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {testResult && (
            <div className={`p-3 rounded-lg text-sm mt-4 border ${testResult.success ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
              <div className="flex items-center gap-2 mb-1">
                {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span className="font-medium">{testResult.success ? 'Connection Successful' : 'Connection Failed'}</span>
              </div>
              <p className="text-xs opacity-90">{testResult.message}</p>
              {testResult.timestamp && <p className="text-[10px] opacity-70 mt-2">Tested at: {testResult.timestamp}</p>}
            </div>
          )}
        </form>

        <div className="space-y-6 bg-white dark:bg-surface/70 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <List className="w-5 h-5 text-brand-green" />
            MCP Tool Registry
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
            Enable or disable specific tools for the AI Ads Copilot. This gives you granular control over what the AI is allowed to do.
          </p>

          <div className="space-y-3">
            {tools.map((tool) => (
              <div key={tool.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-surface-light border border-slate-200 dark:border-white/10 rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{tool.displayName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      tool.riskLevel === 'READ_ONLY' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                      tool.riskLevel === 'WRITE_SPEND' ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                      'bg-red-500/20 text-red-600 dark:text-red-400'
                    }`}>
                      {tool.riskLevel}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-text-secondary font-mono">{tool.toolKey}</span>
                </div>
                <button
                  onClick={() => toggleTool(tool.toolKey, !tool.isEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${tool.isEnabled ? 'bg-brand-green' : 'bg-slate-300 dark:bg-surface border border-slate-300 dark:border-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${tool.isEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
            {tools.length === 0 && (
              <div className="text-center text-sm text-slate-500 dark:text-text-secondary py-8">
                No tools registered yet. Seed the database to populate this list.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
