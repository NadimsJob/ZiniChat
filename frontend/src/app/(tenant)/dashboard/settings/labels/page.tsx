'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { Tag, Plus, Trash2, Edit2, Check, X, Wand2 } from 'lucide-react';

export default function LabelsPage() {
  const { language } = useLanguage();
  const [labels, setLabels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [aiPrompt, setAiPrompt] = useState('');

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchLabels = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/labels`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLabels(await res.json());
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      const token = Cookies.get('access_token');
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId ? `${API}/labels/${editingId}` : `${API}/labels`;
      
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, color, aiPrompt })
      });

      if (res.ok) {
        setIsCreating(false);
        setEditingId(null);
        resetForm();
        fetchLabels();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this label?')) return;
    try {
      const token = Cookies.get('access_token');
      await fetch(`${API}/labels/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchLabels();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setName('');
    setColor('#3b82f6');
    setAiPrompt('');
  };

  const startEdit = (label: any) => {
    setEditingId(label.id);
    setName(label.name);
    setColor(label.color);
    setAiPrompt(label.aiPrompt || '');
    setIsCreating(true);
  };

  return (
    <div className="bg-white/70 dark:bg-[#0f0f11]/80 backdrop-blur-xl border border-white/50 dark:border-zinc-800/80 rounded-2xl p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] max-w-4xl mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Tag className="w-6 h-6 text-primary" />
            {language === 'en' ? 'Conversation Labels' : 'কনভারসেশন লেবেল'}
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            {language === 'en' ? 'Create custom labels to organize your inbox.' : 'আপনার ইনবক্স সাজানোর জন্য কাস্টম লেবেল তৈরি করুন।'}
          </p>
        </div>
        
        {!isCreating && (
          <button
            onClick={() => { resetForm(); setIsCreating(true); }}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
          >
            <Plus className="w-3.5 h-3.5" />
            {language === 'en' ? 'New Label' : 'নতুন লেবেল'}
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl p-1.5 shadow-sm animate-in zoom-in-95 duration-200">
          <h2 className="text-[13px] font-bold mb-2">{editingId ? (language === 'en' ? 'Edit Label' : 'লেবেল এডিট করুন') : (language === 'en' ? 'Create Label' : 'নতুন লেবেল তৈরি করুন')}</h2>
          
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">
                  {language === 'en' ? 'Label Name' : 'লেবেলের নাম'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-1.5 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-[#0f0f11] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="e.g. Hot Lead"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">
                  {language === 'en' ? 'Color' : 'কালার'}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  />
                  <span className="text-[13px] text-slate-500 font-mono">{color}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700 dark:text-zinc-300">
                <Wand2 className="w-3.5 h-3.5 text-purple-500" />
                {language === 'en' ? 'Auto AI Tagging Prompt (Optional)' : 'অটো এআই ট্যাগিং প্রম্পট (ঐচ্ছিক)'}
              </label>
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                rows={2}
                className="w-full px-1.5 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-[#0f0f11] focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none text-[13px]"
                placeholder={language === 'en' ? "e.g. Apply this label if the customer asks about pricing." : "যেমন: যদি কাস্টমার দাম জানতে চায়, তবে এই লেবেলটি দিবে।"}
              />
              <p className="text-[11px] text-slate-500">
                {language === 'en' ? 'The AI will read this instruction and automatically apply the label to matching conversations.' : 'এআই এই ইনস্ট্রাকশন পড়বে এবং মিলে গেলে অটোমেটিক চ্যাটে এই লেবেল বসিয়ে দিবে।'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-4 border-t border-slate-100 dark:border-zinc-800/50 mt-4">
              <button
                onClick={() => { setIsCreating(false); setEditingId(null); resetForm(); }}
                className="px-1.5 py-2 text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800 rounded-xl transition-colors font-medium text-[13px]"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="flex items-center gap-2 px-1.5 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 font-medium text-[13px] shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                {language === 'en' ? 'Save Label' : 'লেবেল সেভ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {loading ? (
          <div className="col-span-full py-10 text-center text-slate-500">Loading...</div>
        ) : labels.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl">
            <Tag className="w-9 h-9 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              {language === 'en' ? 'No labels created yet.' : 'এখনো কোনো লেবেল তৈরি করা হয়নি।'}
            </p>
          </div>
        ) : (
          labels.map(label => (
            <div key={label.id} className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 p-3 rounded-2xl shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: label.color }} />
              <div className="flex justify-between items-start ml-2">
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium border"
                        style={{ backgroundColor: `${label.color}15`, color: label.color, borderColor: `${label.color}30` }}>
                    {label.name}
                  </span>
                  {label.aiPrompt && (
                    <div className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-500">
                      <Wand2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <p className="line-clamp-2" title={label.aiPrompt}>{label.aiPrompt}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(label)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(label.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
