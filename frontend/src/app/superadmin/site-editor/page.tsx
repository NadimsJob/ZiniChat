'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export default function SiteEditorPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/landing-page/config`)
      .then(res => res.json())
      .then(data => {
        // Initialize complex structures if they are missing or still in old flat array format
        const featuresJson = Array.isArray(data.featuresJson) && data.featuresJson[0]?.iconName 
          ? data.featuresJson 
          : [];
          
        const pricingJson = (data.pricingJson && !Array.isArray(data.pricingJson) && data.pricingJson.compareFeatures)
          ? data.pricingJson
          : { compareFeatures: [] };

        const faqsJson = (data.faqsJson && !Array.isArray(data.faqsJson) && data.faqsJson.categories)
          ? data.faqsJson
          : { categories: [], faqs: [] };

        setConfig({
          ...data,
          featuresJson,
          pricingJson,
          faqsJson,
          privacyPolicyJson: data.privacyPolicyJson || { en: '', bn: '' },
          termsConditionsJson: data.termsConditionsJson || { en: '', bn: '' },
          contactInfo: data.contactInfo || { address: { en: '', bn: '' }, email: '', phone: '' },
          socialLinksJson: data.socialLinksJson || {
            facebook: { url: '', enabled: false },
            twitter: { url: '', enabled: false },
            linkedin: { url: '', enabled: false },
            instagram: { url: '', enabled: false },
            whatsapp: { url: '', enabled: false }
          }
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
        privacyPolicyJson: config.privacyPolicyJson,
        termsConditionsJson: config.termsConditionsJson,
        contactInfo: config.contactInfo,
        socialLinksJson: config.socialLinksJson,
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

  // --- HELPERS FOR ARRAYS ---
  
  const updateFlatArray = (arrayRef: any[], index: number, field: string, value: any, subField?: string) => {
    const newArr = [...arrayRef];
    if (subField) {
      if (!newArr[index][field]) newArr[index][field] = {};
      newArr[index][field][subField] = value;
    } else {
      newArr[index][field] = value;
    }
    return newArr;
  };

  const moveArrayItem = (arrayRef: any[], index: number, dir: number) => {
    if (index + dir < 0 || index + dir >= arrayRef.length) return arrayRef;
    const newArr = [...arrayRef];
    const temp = newArr[index];
    newArr[index] = newArr[index + dir];
    newArr[index + dir] = temp;
    return newArr;
  };

  const removeArrayItem = (arrayRef: any[], index: number) => {
    const newArr = [...arrayRef];
    newArr.splice(index, 1);
    return newArr;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex items-center justify-between bg-surface p-4 rounded-xl border border-surface-hover sticky top-4 z-10 shadow-lg">
        <div>
          <h1 className="text-lg font-bold text-foreground">Site Editor (Advanced)</h1>
          <p className="text-xs text-zinc-400 mt-1">Manage interactive features, FAQs, and Pricing matrix.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-glow"
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {/* HERO SECTION */}
      <div className="bg-surface border border-surface-hover p-4 rounded-xl space-y-4">
        <h2 className="font-bold text-foreground border-b border-surface-hover pb-2">1. Hero Section</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Headline (EN)</label>
            <input 
              type="text" value={config.heroTitle || ''}
              onChange={e => setConfig({...config, heroTitle: e.target.value})}
              className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" 
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-primary">Headline (BN)</label>
            <input 
              type="text" value={config.heroTitleBn || ''}
              onChange={e => setConfig({...config, heroTitleBn: e.target.value})}
              className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" 
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Sub-headline (EN)</label>
            <textarea 
              rows={2} value={config.heroSubtitle || ''}
              onChange={e => setConfig({...config, heroSubtitle: e.target.value})}
              className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" 
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-primary">Sub-headline (BN)</label>
            <textarea 
              rows={2} value={config.heroSubtitleBn || ''}
              onChange={e => setConfig({...config, heroSubtitleBn: e.target.value})}
              className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" 
            />
          </div>
        </div>
      </div>

      {/* INTERACTIVE FEATURES */}
      <div className="bg-surface border border-surface-hover p-4 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-surface-hover pb-2">
          <h2 className="font-bold text-orange-400">2. Interactive Features (Tabs)</h2>
          <button 
            onClick={() => {
              const newArr = [...config.featuresJson, { id: 'new_'+Date.now(), iconName: 'Star', colorTheme: 'green', title: { en: '', bn: '' }, description: { en: '', bn: '' }, bullets: { en: [], bn: [] } }];
              setConfig({...config, featuresJson: newArr});
            }}
            className="flex items-center gap-1 text-xs bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-lg font-bold"
          >
            <Plus className="w-4 h-4" /> Add Tab
          </button>
        </div>
        
        <div className="space-y-4">
          {config.featuresJson?.map((f: any, i: number) => (
            <div key={i} className="p-4 border border-surface-hover rounded-xl bg-background/50 relative">
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button onClick={() => setConfig({...config, featuresJson: moveArrayItem(config.featuresJson, i, -1)})} className="p-1 hover:bg-surface rounded"><ArrowUp className="w-4 h-4 text-zinc-400"/></button>
                <button onClick={() => setConfig({...config, featuresJson: moveArrayItem(config.featuresJson, i, 1)})} className="p-1 hover:bg-surface rounded"><ArrowDown className="w-4 h-4 text-zinc-400"/></button>
                <button onClick={() => setConfig({...config, featuresJson: removeArrayItem(config.featuresJson, i)})} className="p-1 hover:bg-red-500/10 text-red-500 rounded ml-2"><Trash2 className="w-4 h-4"/></button>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mr-32 mb-4">
                <div>
                  <label className="block text-xs font-medium mb-1">ID (Unique)</label>
                  <input type="text" value={f.id || ''} onChange={e => setConfig({...config, featuresJson: updateFlatArray(config.featuresJson, i, 'id', e.target.value)})} className="w-full bg-surface border border-surface-hover rounded-lg px-2 py-1 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Lucide Icon Name</label>
                  <input type="text" value={f.iconName || ''} onChange={e => setConfig({...config, featuresJson: updateFlatArray(config.featuresJson, i, 'iconName', e.target.value)})} className="w-full bg-surface border border-surface-hover rounded-lg px-2 py-1 text-xs" placeholder="e.g. Bot, MessageSquare" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Color Theme</label>
                  <select value={f.colorTheme || 'green'} onChange={e => setConfig({...config, featuresJson: updateFlatArray(config.featuresJson, i, 'colorTheme', e.target.value)})} className="w-full bg-surface border border-surface-hover rounded-lg px-2 py-1 text-xs">
                    <option value="green">Green</option><option value="blue">Blue</option><option value="orange">Orange</option><option value="purple">Purple</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <input type="text" placeholder="Title (EN)" value={f.title?.en || ''} onChange={e => setConfig({...config, featuresJson: updateFlatArray(config.featuresJson, i, 'title', e.target.value, 'en')})} className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-xs font-bold" />
                  <textarea placeholder="Description (EN)" rows={2} value={f.description?.en || ''} onChange={e => setConfig({...config, featuresJson: updateFlatArray(config.featuresJson, i, 'description', e.target.value, 'en')})} className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-xs" />
                  <textarea placeholder="Bullets (EN) - comma separated" rows={2} value={(f.bullets?.en || []).join(', ')} onChange={e => setConfig({...config, featuresJson: updateFlatArray(config.featuresJson, i, 'bullets', e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean), 'en')})} className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-xs" />
                </div>
                <div className="space-y-2">
                  <input type="text" placeholder="Title (BN)" value={f.title?.bn || ''} onChange={e => setConfig({...config, featuresJson: updateFlatArray(config.featuresJson, i, 'title', e.target.value, 'bn')})} className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-xs font-bold text-primary" />
                  <textarea placeholder="Description (BN)" rows={2} value={f.description?.bn || ''} onChange={e => setConfig({...config, featuresJson: updateFlatArray(config.featuresJson, i, 'description', e.target.value, 'bn')})} className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-xs text-primary" />
                  <textarea placeholder="Bullets (BN) - comma separated" rows={2} value={(f.bullets?.bn || []).join(', ')} onChange={e => setConfig({...config, featuresJson: updateFlatArray(config.featuresJson, i, 'bullets', e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean), 'bn')})} className="w-full bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-xs text-primary" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PRICING MATRIX */}
      <div className="bg-surface border border-surface-hover p-4 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-surface-hover pb-2">
          <h2 className="font-bold text-emerald-400">3. Pricing Comparison Matrix</h2>
          <button 
            onClick={() => {
              const newArr = [...(config.pricingJson?.compareFeatures || []), { id: 'new_'+Date.now(), type: 'boolean', featureKey: '', en: '', bn: '' }];
              setConfig({...config, pricingJson: { ...config.pricingJson, compareFeatures: newArr }});
            }}
            className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg font-bold"
          >
            <Plus className="w-4 h-4" /> Add Matrix Row
          </button>
        </div>
        
        <div className="space-y-2">
          {config.pricingJson?.compareFeatures?.map((row: any, i: number) => (
            <div key={i} className={`p-2 border border-surface-hover rounded-lg flex items-center gap-3 ${row.type === 'header' ? 'bg-surface-hover/50' : 'bg-background'}`}>
              <div className="flex flex-col gap-1 w-8 items-center">
                <button onClick={() => setConfig({...config, pricingJson: { ...config.pricingJson, compareFeatures: moveArrayItem(config.pricingJson.compareFeatures, i, -1) }})} className="p-0.5 hover:bg-surface rounded"><ArrowUp className="w-3 h-3 text-zinc-400"/></button>
                <button onClick={() => setConfig({...config, pricingJson: { ...config.pricingJson, compareFeatures: moveArrayItem(config.pricingJson.compareFeatures, i, 1) }})} className="p-0.5 hover:bg-surface rounded"><ArrowDown className="w-3 h-3 text-zinc-400"/></button>
              </div>
              <div className="w-24 shrink-0">
                <select value={row.type} onChange={e => setConfig({...config, pricingJson: { ...config.pricingJson, compareFeatures: updateFlatArray(config.pricingJson.compareFeatures, i, 'type', e.target.value) }})} className="w-full bg-surface border border-surface-hover rounded text-xs px-1 py-1">
                  <option value="header">Header</option>
                  <option value="boolean">Checkmark</option>
                  <option value="value">Text Value</option>
                </select>
              </div>
              <div className="w-32 shrink-0">
                <input type="text" placeholder="DB Field / featureKey" value={row.featureKey || ''} onChange={e => setConfig({...config, pricingJson: { ...config.pricingJson, compareFeatures: updateFlatArray(config.pricingJson.compareFeatures, i, 'featureKey', e.target.value) }})} className="w-full bg-surface border border-surface-hover rounded px-2 py-1 text-xs" disabled={row.type === 'header'} />
              </div>
              <input type="text" placeholder="Label (EN)" value={row.en || ''} onChange={e => setConfig({...config, pricingJson: { ...config.pricingJson, compareFeatures: updateFlatArray(config.pricingJson.compareFeatures, i, 'en', e.target.value) }})} className="flex-1 bg-surface border border-surface-hover rounded px-2 py-1 text-xs font-medium" />
              <input type="text" placeholder="Label (BN)" value={row.bn || ''} onChange={e => setConfig({...config, pricingJson: { ...config.pricingJson, compareFeatures: updateFlatArray(config.pricingJson.compareFeatures, i, 'bn', e.target.value) }})} className="flex-1 bg-surface border border-surface-hover rounded px-2 py-1 text-xs font-medium text-primary" />
              <button onClick={() => setConfig({...config, pricingJson: { ...config.pricingJson, compareFeatures: removeArrayItem(config.pricingJson.compareFeatures, i) }})} className="p-1.5 hover:bg-red-500/10 text-red-500 rounded"><Trash2 className="w-4 h-4"/></button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQS */}
      <div className="bg-surface border border-surface-hover p-4 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-surface-hover pb-2">
          <h2 className="font-bold text-blue-400">4. FAQs (Categorized)</h2>
        </div>
        
        {/* FAQ Categories */}
        <div className="bg-background/50 p-3 rounded-lg border border-surface-hover">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Categories</h3>
            <button 
              onClick={() => {
                const newArr = [...(config.faqsJson?.categories || []), { id: 'cat_'+Date.now(), icon: 'MessageCircleQuestion', en: '', bn: '' }];
                setConfig({...config, faqsJson: { ...config.faqsJson, categories: newArr }});
              }}
              className="text-xs text-blue-500 font-bold hover:underline"
            >+ Add Category</button>
          </div>
          <div className="space-y-2">
            {config.faqsJson?.categories?.map((cat: any, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="text" placeholder="ID" value={cat.id || ''} onChange={e => setConfig({...config, faqsJson: { ...config.faqsJson, categories: updateFlatArray(config.faqsJson.categories, i, 'id', e.target.value) }})} className="w-24 bg-surface border border-surface-hover rounded px-2 py-1 text-xs" />
                <input type="text" placeholder="Icon" value={cat.icon || ''} onChange={e => setConfig({...config, faqsJson: { ...config.faqsJson, categories: updateFlatArray(config.faqsJson.categories, i, 'icon', e.target.value) }})} className="w-24 bg-surface border border-surface-hover rounded px-2 py-1 text-xs" />
                <input type="text" placeholder="Name EN" value={cat.en || ''} onChange={e => setConfig({...config, faqsJson: { ...config.faqsJson, categories: updateFlatArray(config.faqsJson.categories, i, 'en', e.target.value) }})} className="flex-1 bg-surface border border-surface-hover rounded px-2 py-1 text-xs" />
                <input type="text" placeholder="Name BN" value={cat.bn || ''} onChange={e => setConfig({...config, faqsJson: { ...config.faqsJson, categories: updateFlatArray(config.faqsJson.categories, i, 'bn', e.target.value) }})} className="flex-1 bg-surface border border-surface-hover rounded px-2 py-1 text-xs text-primary" />
                <button onClick={() => setConfig({...config, faqsJson: { ...config.faqsJson, categories: removeArrayItem(config.faqsJson.categories, i) }})} className="p-1 hover:text-red-500 text-zinc-500"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
        <div className="bg-background/50 p-3 rounded-lg border border-surface-hover mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Questions & Answers</h3>
            <button 
              onClick={() => {
                const newArr = [...(config.faqsJson?.faqs || []), { categoryId: '', question: { en: '', bn: '' }, answer: { en: '', bn: '' } }];
                setConfig({...config, faqsJson: { ...config.faqsJson, faqs: newArr }});
              }}
              className="text-xs text-blue-500 font-bold hover:underline"
            >+ Add FAQ</button>
          </div>
          <div className="space-y-3">
            {config.faqsJson?.faqs?.map((faq: any, i: number) => (
              <div key={i} className="p-3 border border-surface-hover rounded-xl bg-surface relative">
                <button onClick={() => setConfig({...config, faqsJson: { ...config.faqsJson, faqs: removeArrayItem(config.faqsJson.faqs, i) }})} className="absolute top-3 right-3 text-zinc-500 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                <div className="mb-2 w-48">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Category</label>
                  <select value={faq.categoryId || ''} onChange={e => setConfig({...config, faqsJson: { ...config.faqsJson, faqs: updateFlatArray(config.faqsJson.faqs, i, 'categoryId', e.target.value) }})} className="w-full bg-background border border-surface-hover rounded px-2 py-1 text-xs">
                    <option value="">Select Category...</option>
                    {config.faqsJson?.categories?.map((c:any) => (
                      <option key={c.id} value={c.id}>{c.en}</option>
                    ))}
                  </select>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <input type="text" placeholder="Question (EN)" value={faq.question?.en || ''} onChange={e => setConfig({...config, faqsJson: { ...config.faqsJson, faqs: updateFlatArray(config.faqsJson.faqs, i, 'question', e.target.value, 'en') }})} className="w-full bg-background border border-surface-hover rounded-lg px-3 py-1.5 text-xs font-bold mb-2" />
                    <textarea placeholder="Answer (EN)" rows={2} value={faq.answer?.en || ''} onChange={e => setConfig({...config, faqsJson: { ...config.faqsJson, faqs: updateFlatArray(config.faqsJson.faqs, i, 'answer', e.target.value, 'en') }})} className="w-full bg-background border border-surface-hover rounded-lg px-3 py-1.5 text-xs" />
                  </div>
                  <div>
                    <input type="text" placeholder="Question (BN)" value={faq.question?.bn || ''} onChange={e => setConfig({...config, faqsJson: { ...config.faqsJson, faqs: updateFlatArray(config.faqsJson.faqs, i, 'question', e.target.value, 'bn') }})} className="w-full bg-background border border-surface-hover rounded-lg px-3 py-1.5 text-xs font-bold text-primary mb-2" />
                    <textarea placeholder="Answer (BN)" rows={2} value={faq.answer?.bn || ''} onChange={e => setConfig({...config, faqsJson: { ...config.faqsJson, faqs: updateFlatArray(config.faqsJson.faqs, i, 'answer', e.target.value, 'bn') }})} className="w-full bg-background border border-surface-hover rounded-lg px-3 py-1.5 text-xs text-primary" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      {/* LEGAL & FOOTER */}
      <div className="bg-surface border border-surface-hover p-4 rounded-xl space-y-6">
        <h2 className="font-bold border-b border-surface-hover pb-2">5. Footer & Legal Pages</h2>
        
        {/* Contact Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground">Contact Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Address (EN)</label>
              <textarea rows={2} value={config.contactInfo?.address?.en || ''} onChange={e => setConfig({...config, contactInfo: {...config.contactInfo, address: {...config.contactInfo?.address, en: e.target.value}}})} className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-sm focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-primary">Address (BN)</label>
              <textarea rows={2} value={config.contactInfo?.address?.bn || ''} onChange={e => setConfig({...config, contactInfo: {...config.contactInfo, address: {...config.contactInfo?.address, bn: e.target.value}}})} className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-sm focus:border-primary text-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Email</label>
              <input type="email" value={config.contactInfo?.email || ''} onChange={e => setConfig({...config, contactInfo: {...config.contactInfo, email: e.target.value}})} className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-sm focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Phone</label>
              <input type="text" value={config.contactInfo?.phone || ''} onChange={e => setConfig({...config, contactInfo: {...config.contactInfo, phone: e.target.value}})} className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-sm focus:border-primary" />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-3 pt-4 border-t border-surface-hover">
          <h3 className="text-sm font-bold text-muted-foreground">Social Media Links</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {['facebook', 'twitter', 'linkedin', 'instagram', 'whatsapp'].map(platform => (
              <div key={platform} className="flex items-center gap-3 p-3 bg-background border border-surface-hover rounded-lg">
                <input type="checkbox" checked={config.socialLinksJson?.[platform]?.enabled || false} onChange={e => setConfig({...config, socialLinksJson: {...config.socialLinksJson, [platform]: {...config.socialLinksJson?.[platform], enabled: e.target.checked}}})} className="w-4 h-4 rounded text-primary border-surface-hover focus:ring-primary" />
                <div className="flex-1">
                  <label className="block text-xs font-medium capitalize mb-1">{platform}</label>
                  <input type="text" placeholder="URL" value={config.socialLinksJson?.[platform]?.url || ''} onChange={e => setConfig({...config, socialLinksJson: {...config.socialLinksJson, [platform]: {...config.socialLinksJson?.[platform], url: e.target.value}}})} className="w-full bg-surface border border-surface-hover rounded px-2 py-1 text-xs" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Policy */}
        <div className="space-y-3 pt-4 border-t border-surface-hover">
          <h3 className="text-sm font-bold text-muted-foreground">Privacy Policy Page</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Content (EN) - Supports basic HTML/Markdown</label>
              <textarea rows={6} value={config.privacyPolicyJson?.en || ''} onChange={e => setConfig({...config, privacyPolicyJson: {...config.privacyPolicyJson, en: e.target.value}})} className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-sm focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-primary">Content (BN)</label>
              <textarea rows={6} value={config.privacyPolicyJson?.bn || ''} onChange={e => setConfig({...config, privacyPolicyJson: {...config.privacyPolicyJson, bn: e.target.value}})} className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-sm focus:border-primary text-primary" />
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="space-y-3 pt-4 border-t border-surface-hover">
          <h3 className="text-sm font-bold text-muted-foreground">Terms & Conditions Page</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Content (EN) - Supports basic HTML/Markdown</label>
              <textarea rows={6} value={config.termsConditionsJson?.en || ''} onChange={e => setConfig({...config, termsConditionsJson: {...config.termsConditionsJson, en: e.target.value}})} className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-sm focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-primary">Content (BN)</label>
              <textarea rows={6} value={config.termsConditionsJson?.bn || ''} onChange={e => setConfig({...config, termsConditionsJson: {...config.termsConditionsJson, bn: e.target.value}})} className="w-full bg-background border border-surface-hover rounded-lg px-3 py-2 text-sm focus:border-primary text-primary" />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
