'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { Plus, Trash2 } from 'lucide-react';

export default function SiteEditorPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/landing-page/config`)
      .then(res => res.json())
      .then(data => {
        // Ensure all arrays are properly initialized even if they come back null/undefined
        setConfig({
          ...data,
          featuresJson: Array.isArray(data.featuresJson) ? data.featuresJson : [],
          pricingJson: Array.isArray(data.pricingJson) ? data.pricingJson : [],
          faqsJson: Array.isArray(data.faqsJson) ? data.faqsJson : [],
        });
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        heroTitle: config.heroTitle,
        heroTitleBn: config.heroTitleBn,
        heroSubtitle: config.heroSubtitle,
        heroSubtitleBn: config.heroSubtitleBn,
        featuresJson: config.featuresJson,
        pricingJson: config.pricingJson,
        faqsJson: config.faqsJson,
      };

      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/landing-page/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Landing page content updated successfully!');
      } else {
        alert('Failed to update content.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving config.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-zinc-400">Loading editor...</div>;
  if (!config) return <div className="text-red-400">Failed to load config.</div>;

  // Helpers for Array state mutations
  const updateArrayItem = (arrayName: string, index: number, field: string, value: string, subField?: 'en' | 'bn') => {
    const newArray = [...config[arrayName]];
    if (subField) {
      if (!newArray[index][field]) newArray[index][field] = {};
      newArray[index][field][subField] = value;
    } else {
      newArray[index][field] = value;
    }
    setConfig({ ...config, [arrayName]: newArray });
  };

  const removeArrayItem = (arrayName: string, index: number) => {
    const newArray = [...config[arrayName]];
    newArray.splice(index, 1);
    setConfig({ ...config, [arrayName]: newArray });
  };

  const addArrayItem = (arrayName: string, template: any) => {
    const newArray = [...config[arrayName]];
    newArray.push(template);
    setConfig({ ...config, [arrayName]: newArray });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-bold text-foreground">Site Editor</h1>
          <p className="text-zinc-400 mt-2">Update the content of your public landing pages with an easy-to-use UI.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-3">
        
        {/* HERO SECTION */}
        <div className="bg-surface border border-surface-hover p-3 rounded-xl">
          <h2 className="text-[15px] font-bold mb-2">Hero Section</h2>
          <div className="space-y-2">
            <div>
              <label className="block text-[12px] font-medium mb-2">Headline (EN)</label>
              <input 
                type="text" 
                value={config.heroTitle || ''}
                onChange={e => setConfig({...config, heroTitle: e.target.value})}
                className="w-full bg-background border border-surface-hover rounded-xl px-2.5 py-2 focus:outline-none focus:border-primary mb-2" 
              />
              <label className="block text-[12px] font-medium mb-2 text-primary">Headline (BN)</label>
              <input 
                type="text" 
                value={config.heroTitleBn || ''}
                onChange={e => setConfig({...config, heroTitleBn: e.target.value})}
                className="w-full bg-background border border-surface-hover rounded-xl px-2.5 py-2 focus:outline-none focus:border-primary" 
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-2">Sub-headline (EN)</label>
              <textarea 
                rows={2}
                value={config.heroSubtitle || ''}
                onChange={e => setConfig({...config, heroSubtitle: e.target.value})}
                className="w-full bg-background border border-surface-hover rounded-xl px-2.5 py-2 focus:outline-none focus:border-primary mb-2" 
              />
              <label className="block text-[12px] font-medium mb-2 text-primary">Sub-headline (BN)</label>
              <textarea 
                rows={2}
                value={config.heroSubtitleBn || ''}
                onChange={e => setConfig({...config, heroSubtitleBn: e.target.value})}
                className="w-full bg-background border border-surface-hover rounded-xl px-2.5 py-2 focus:outline-none focus:border-primary" 
              />
            </div>
          </div>
        </div>

        {/* FEATURES SECTION */}
        <div className="bg-surface border border-surface-hover p-3 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[15px] font-bold text-orange-400">Features</h2>
            <button 
              onClick={() => addArrayItem('featuresJson', { title: { en: '', bn: '' }, description: { en: '', bn: '' } })}
              className="flex items-center gap-1 text-[12px] bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-lg hover:bg-orange-500/20 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" /> Add Feature
            </button>
          </div>
          
          <div className="space-y-2">
            {config.featuresJson?.map((feature: any, idx: number) => (
              <div key={idx} className="p-2.5 border border-surface-hover rounded-xl bg-background relative group">
                <button 
                  onClick={() => removeArrayItem('featuresJson', idx)}
                  className="absolute top-2.5 right-4 text-zinc-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid md:grid-cols-2 gap-2.5 pr-8">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-zinc-500">Title (EN)</label>
                    <input 
                      type="text" value={feature.title?.en || (typeof feature.title === 'string' ? feature.title : '')}
                      onChange={e => updateArrayItem('featuresJson', idx, 'title', e.target.value, 'en')}
                      className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-orange-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-zinc-500">Title (BN)</label>
                    <input 
                      type="text" value={feature.title?.bn || ''}
                      onChange={e => updateArrayItem('featuresJson', idx, 'title', e.target.value, 'bn')}
                      className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-orange-500" 
                    />
                  </div>
                  <div className="md:col-span-2 grid md:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-zinc-500">Description (EN)</label>
                      <textarea 
                        rows={2} value={feature.description?.en || (typeof feature.description === 'string' ? feature.description : '')}
                        onChange={e => updateArrayItem('featuresJson', idx, 'description', e.target.value, 'en')}
                        className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-orange-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-zinc-500">Description (BN)</label>
                      <textarea 
                        rows={2} value={feature.description?.bn || ''}
                        onChange={e => updateArrayItem('featuresJson', idx, 'description', e.target.value, 'bn')}
                        className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-orange-500" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {config.featuresJson?.length === 0 && <div className="text-[12px] text-zinc-500 italic">No features added.</div>}
          </div>
        </div>



        {/* FAQS SECTION */}
        <div className="bg-surface border border-surface-hover p-3 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[15px] font-bold text-blue-400">FAQs</h2>
            <button 
              onClick={() => addArrayItem('faqsJson', { question: { en: '', bn: '' }, answer: { en: '', bn: '' } })}
              className="flex items-center gap-1 text-[12px] bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" /> Add FAQ
            </button>
          </div>
          
          <div className="space-y-2">
            {config.faqsJson?.map((faq: any, idx: number) => (
              <div key={idx} className="p-2.5 border border-surface-hover rounded-xl bg-background relative group">
                <button 
                  onClick={() => removeArrayItem('faqsJson', idx)}
                  className="absolute top-2.5 right-4 text-zinc-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid md:grid-cols-2 gap-2.5 pr-8">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-zinc-500">Question (EN)</label>
                    <input 
                      type="text" value={faq.question?.en || (typeof faq.question === 'string' ? faq.question : '')}
                      onChange={e => updateArrayItem('faqsJson', idx, 'question', e.target.value, 'en')}
                      className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-zinc-500">Question (BN)</label>
                    <input 
                      type="text" value={faq.question?.bn || ''}
                      onChange={e => updateArrayItem('faqsJson', idx, 'question', e.target.value, 'bn')}
                      className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                  <div className="md:col-span-2 grid md:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-zinc-500">Answer (EN)</label>
                      <textarea 
                        rows={3} value={faq.answer?.en || (typeof faq.answer === 'string' ? faq.answer : '')}
                        onChange={e => updateArrayItem('faqsJson', idx, 'answer', e.target.value, 'en')}
                        className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-blue-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-zinc-500">Answer (BN)</label>
                      <textarea 
                        rows={3} value={faq.answer?.bn || ''}
                        onChange={e => updateArrayItem('faqsJson', idx, 'answer', e.target.value, 'bn')}
                        className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-blue-500" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {config.faqsJson?.length === 0 && <div className="text-[12px] text-zinc-500 italic">No FAQs added.</div>}
          </div>
        </div>

      </div>
    </div>
  );
}
