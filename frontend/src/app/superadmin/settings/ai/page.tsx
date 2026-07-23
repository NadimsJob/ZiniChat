'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { Bot, Plus, Trash2, Edit2, Play, CheckCircle, AlertCircle, ToggleLeft, ToggleRight, Settings, RefreshCcw } from 'lucide-react';

export default function AiSettingsPage() {
  const { language } = useLanguage();
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [id: string]: { type: 'success' | 'error', text: string } }>({});
  const [loadingModels, setLoadingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [defaultModal, setDefaultModal] = useState<{isOpen: boolean, config: any}>({ isOpen: false, config: null });

  const [form, setForm] = useState({
    id: '',
    name: '',
    provider: 'openai',
    modelName: '',
    apiKey: '',
    apiEndpoint: '',
    isActive: false
  });

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setConfigs(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const openModal = (config?: any) => {
    if (config) {
      setForm({
        id: config.id,
        name: config.name,
        provider: config.provider || 'openai',
        modelName: config.modelName,
        apiKey: config.apiKey,
        apiEndpoint: config.apiEndpoint || '',
        isActive: config.isActive
      });
      setFetchedModels([]);
    } else {
      setForm({
        id: '',
        name: '',
        provider: 'openai',
        modelName: '',
        apiKey: '',
        apiEndpoint: '',
        isActive: false
      });
      setFetchedModels([]);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setModalOpen(false);
        fetchConfigs();
      } else {
        alert('Failed to save config.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to delete this AI Configuration?' : 'আপনি কি নিশ্চিত যে এই এআই কনফিগারেশনটি মুছে ফেলতে চান?')) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-config/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchConfigs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActiveClick = (config: any) => {
    if (config.isActive) return;
    setDefaultModal({ isOpen: true, config });
  };

  const submitDefaultConfig = async (overrideAll: boolean) => {
    if (!defaultModal.config) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-config/${defaultModal.config.id}/set-default`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ overrideAllTenants: overrideAll })
      });
      if (res.ok) {
        setDefaultModal({ isOpen: false, config: null });
        fetchConfigs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(prev => ({ ...prev, [id]: { type: 'success', text: language === 'en' ? 'Testing...' : 'পরীক্ষা করা হচ্ছে...' } }));
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-config/${id}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const text = await res.text();
        setTestResult(prev => ({ ...prev, [id]: { type: 'success', text: `${language === 'en' ? 'Success:' : 'সফল:'} "${text}"` } }));
      } else {
        const err = await res.json();
        setTestResult(prev => ({ ...prev, [id]: { type: 'error', text: err.message || (language === 'en' ? 'Connection Failed' : 'সংযোগ ব্যর্থ হয়েছে') } }));
      }
    } catch (err) {
      console.error(err);
      setTestResult(prev => ({ ...prev, [id]: { type: 'error', text: 'Error connecting' } }));
    } finally {
      setTestingId(null);
    }
  };

  const handleFetchModels = async () => {
    if (!form.apiKey) {
      alert(language === 'en' ? 'Please enter an API Key first.' : 'দয়া করে আগে API Key দিন।');
      return;
    }
    setLoadingModels(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-config/fetch-models`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: form.apiKey,
          apiEndpoint: form.apiEndpoint,
          provider: form.provider
        })
      });

      if (res.ok) {
        const models = await res.json();
        if (models.length > 0) {
          setFetchedModels(models);
          setForm(prev => ({ ...prev, modelName: models[0] }));
        } else {
          alert(language === 'en' ? 'No models found.' : 'কোনো মডেল পাওয়া যায়নি।');
        }
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to fetch models');
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching models');
    } finally {
      setLoadingModels(false);
    }
  };

  if (loading) {
    return <div className="p-2.5 text-center text-zinc-500">Loading AI Configurations...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-2 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[15px] font-bold tracking-tight flex items-center gap-3">
            <Bot className="w-4 h-4 text-secondary" />
            {language === 'en' ? 'AI Integrations' : 'এআই ইন্টিগ্রেশন'}
          </h1>
          <p className="text-zinc-400 mt-2">
            {language === 'en' ? 'Manage multiple AI model endpoints and credentials for tenant bot assistants.' : 'টিম চ্যাট অ্যাসিস্ট্যান্ট ও বট পরিচালনা করার জন্য এআই ক্রেডেনশিয়াল কনফিগার করুন।'}
          </p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 px-2.5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/95 transition-all font-semibold shadow-lg shadow-primary/20 text-[12px]"
        >
          <Plus className="w-4 h-4" />
          {language === 'en' ? 'Add Model Config' : 'মডেল কনফিগারেশন যোগ করুন'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {configs.map(config => (
          <div key={config.id} className="bg-surface border border-surface-hover p-3 rounded-xl space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-[13px] text-zinc-100">{config.name}</h3>
                </div>
                <button 
                  onClick={() => handleToggleActiveClick(config)}
                  className="text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {config.isActive ? (
                    <div className="flex items-center gap-1 text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded">
                      <CheckCircle className="w-4 h-4" /> Active
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-zinc-500 font-bold bg-zinc-500/10 px-2 py-1 rounded">
                      <AlertCircle className="w-4 h-4" /> Inactive
                    </div>
                  )}
                </button>
              </div>

              <div className="text-[12px] text-zinc-400 space-y-1">
                <div>Model Name: <span className="font-medium text-zinc-200">{config.modelName}</span></div>
                {config.apiEndpoint && <div className="truncate">Endpoint: <span className="font-mono text-xs text-zinc-300">{config.apiEndpoint}</span></div>}
              </div>
            </div>

            {testResult[config.id] && (
              <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${testResult[config.id].type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' : 'bg-red-500/10 text-red-500 border border-red-500/10'}`}>
                {testResult[config.id].type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <span className="break-all">{testResult[config.id].text}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-4 border-t border-surface-hover">
              <button 
                onClick={() => handleTestConnection(config.id)}
                disabled={testingId !== null}
                className="flex-1 flex justify-center items-center gap-2 px-3 py-1.5 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-lg transition-colors text-xs font-semibold"
              >
                <Play className="w-3.5 h-3.5" />
                {language === 'en' ? 'Test Connection' : 'সংযোগ পরীক্ষা করুন'}
              </button>
              <button 
                onClick={() => openModal(config)}
                className="p-1.5 bg-surface-hover hover:bg-surface-hover/80 text-zinc-300 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(config.id)}
                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {configs.length === 0 && (
          <div className="col-span-2 py-16 text-center text-zinc-500 border border-dashed border-surface-hover rounded-xl">
            {language === 'en' ? 'No AI Model configuration setup yet.' : 'এখনো কোনো এআই মডেল কনফিগার করা হয়নি।'}
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2.5 z-50 animate-in fade-in duration-300">
          <div className="bg-surface border border-surface-hover rounded-xl w-full max-w-lg overflow-y-auto max-h-[90vh] p-3 space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-surface-hover">
              <h2 className="text-[15px] font-bold text-zinc-100 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {form.id ? (language === 'en' ? 'Edit AI Configuration' : 'এআই কনফিগারেশন এডিট') : (language === 'en' ? 'Add AI Configuration' : 'এআই কনফিগারেশন যোগ')}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-2">
              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">Configuration Name</label>
                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" placeholder="Primary OpenAI GPT-4" />
              </div>

              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">AI Provider</label>
                <select value={form.provider} onChange={e => setForm({...form, provider: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none">
                  <option value="openai">OpenAI Compatible (OpenRouter, Groq, etc.)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">Model Name</label>
                <div className="flex gap-2">
                  {fetchedModels.length > 0 ? (
                    <select required value={form.modelName} onChange={e => setForm({...form, modelName: e.target.value})} className="flex-1 bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none">
                      {fetchedModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <input required type="text" value={form.modelName} onChange={e => setForm({...form, modelName: e.target.value})} className="flex-1 bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" placeholder="e.g. gpt-4o" />
                  )}
                  <button type="button" onClick={handleFetchModels} disabled={loadingModels} className="px-3 py-2 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-2 whitespace-nowrap">
                    <RefreshCcw className={`w-3.5 h-3.5 ${loadingModels ? 'animate-spin' : ''}`} />
                    {language === 'en' ? 'Load Models' : 'মডেল লোড করুন'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">API Key</label>
                <input required type="password" value={form.apiKey} onChange={e => setForm({...form, apiKey: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" placeholder="sk-..." />
              </div>

              <div>
                <label className="block text-[12px] font-medium mb-1 text-zinc-400">API Endpoint URL (Optional)</label>
                <input type="text" value={form.apiEndpoint} onChange={e => setForm({...form, apiEndpoint: e.target.value})} className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-2 focus:border-primary focus:outline-none" placeholder="https://api.openai.com/v1/chat/completions" />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="w-4 h-4 rounded border-zinc-700 text-primary focus:ring-primary focus:ring-offset-background bg-background" />
                  <span className="text-[12px] font-medium">{language === 'en' ? 'Set as Default Configuration' : 'ডিফল্ট হিসেবে সেট করুন'}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-surface-hover">
                <button type="button" onClick={() => setModalOpen(false)} className="px-2.5 py-2 bg-surface-hover hover:bg-surface-hover/80 rounded-lg text-[12px] font-semibold transition-colors">Cancel</button>
                <button type="submit" className="px-2.5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-[12px] font-semibold transition-colors shadow-lg shadow-primary/20">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Default Permission Modal */}
      {defaultModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2.5 z-50 animate-in fade-in duration-300">
          <div className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Set Default AI Model</h3>
            <p className="text-sm text-zinc-400">
              You are setting <strong>{defaultModal.config?.name}</strong> as the new Platform Default. How should this affect existing tenants?
            </p>
            <div className="space-y-3 pt-2">
              <button 
                onClick={() => submitDefaultConfig(false)}
                className="w-full text-left px-4 py-3 rounded-xl border border-zinc-700 hover:border-emerald-500 hover:bg-emerald-500/10 transition-colors"
              >
                <div className="font-semibold text-emerald-400">Apply Only to Default Users</div>
                <div className="text-xs text-zinc-400 mt-1">Keeps manual assignments intact. Tenants who are already using the platform default will automatically switch to this new model.</div>
              </button>
              
              <button 
                onClick={() => submitDefaultConfig(true)}
                className="w-full text-left px-4 py-3 rounded-xl border border-zinc-700 hover:border-red-500 hover:bg-red-500/10 transition-colors"
              >
                <div className="font-semibold text-red-400">Force Apply to ALL Tenants</div>
                <div className="text-xs text-zinc-400 mt-1">Overrides all manual tenant assignments. Every tenant will be forced to use this new AI model.</div>
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setDefaultModal({ isOpen: false, config: null })} className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
