'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { Tag, Plus, Trash2, Edit2, Wand2, RefreshCw } from 'lucide-react';
import LabelForm from '@/components/labels/LabelForm';
import InstructionBanner from '@/components/InstructionBanner';
import toast from 'react-hot-toast';

export default function LabelsPage() {
 const { language } = useLanguage();
 const [labels, setLabels] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [isCreating, setIsCreating] = useState(false);
 const [editingLabel, setEditingLabel] = useState<any>(null);
 const [syncingId, setSyncingId] = useState<string | null>(null);

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

 const handleSaveLabel = async (data: { name: string; color: string; aiPrompt?: string }, id?: string) => {
    try {
      const token = Cookies.get('access_token');
      const method = id ? 'PATCH' : 'POST';
      const url = id ? `${API}/labels/${id}` : `${API}/labels`;
      
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        setIsCreating(false);
        setEditingLabel(null);
        fetchLabels();
        toast.success(id ? 'Label updated' : 'Label created');
      } else {
        toast.error('Failed to save label');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving label');
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

 const handleSyncAi = async (id: string) => {
    setSyncingId(id);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/labels/${id}/sync-ai`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(language === 'en' ? 'Synced to AI Training!' : 'এআই ট্রেনিং এ সিঙ্ক হয়েছে!');
      } else {
        toast.error('Failed to sync to AI');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error syncing to AI');
    } finally {
      setSyncingId(null);
    }
  };

  const startEdit = (label: any) => {
    setEditingLabel(label);
    setIsCreating(true);
  };

 return (
 <div className="bg-card/70 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-sm max-w-4xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 text-foreground">

  {/* Bilingual Instruction Header */}
  <InstructionBanner 
    title={language === 'en' ? 'Tags Management Instructions' : 'ট্যাগ ম্যানেজমেন্ট নির্দেশনা'}
    description={language === 'en' ? 'Create custom tags (e.g., VIP, Follow-up, Complained) to organize your inbox conversations. You can optionally add "AI Instructions" to a tag. When a tag with instructions is applied to a chat, the AI Assistant will read those instructions and adapt its replies accordingly.' : 'আপনার ইনবক্সের মেসেজগুলো গুছিয়ে রাখার জন্য কাস্টম ট্যাগ (যেমন: VIP, Follow-up, Complained) তৈরি করুন। ট্যাগ তৈরির সময় আপনি চাইলে "AI Instructions" যুক্ত করতে পারেন।'}
    icon={Tag}
    variant="emerald"
  />
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
 <div>
  <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground font-sans">
  <Tag className="w-6 h-6 text-primary" />
  {language === 'en' ? 'Conversation Tags' : 'কনভারসেশন ট্যাগ'}
  </h1>
  <p className="text-[13px] text-muted-foreground mt-1">
  {language === 'en' ? 'Create custom tags to organize your inbox.' : 'আপনার ইনবক্স সাজানোর জন্য কাস্টম ট্যাগ তৈরি করুন।'}
  </p>
  </div>
  
  {!isCreating && (
  <button
  onClick={() => { setEditingLabel(null); setIsCreating(true); }}
  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-sm text-xs"
  >
  <Plus className="w-3.5 h-3.5" />
  {language === 'en' ? 'New Tag' : 'নতুন ট্যাগ'}
  </button>
  )}
 </div>

 {isCreating && (
 <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm animate-in zoom-in-95 duration-200">
  <LabelForm 
    initialData={editingLabel} 
    onSave={(data) => handleSaveLabel(data, editingLabel?.id)} 
    onCancel={() => { setIsCreating(false); setEditingLabel(null); }} 
  />
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
  {loading ? (
  <div className="col-span-full py-10 text-center text-muted-foreground">Loading...</div>
  ) : labels.length === 0 ? (
  <div className="col-span-full py-16 text-center bg-card border border-border rounded-2xl">
  <Tag className="w-9 h-9 text-muted-foreground/40 mx-auto mb-3" />
  <p className="text-muted-foreground font-medium">
  {language === 'en' ? 'No tags created yet.' : 'এখনো কোনো ট্যাগ তৈরি করা হয়নি।'}
  </p>
  </div>
  ) : (
  labels.map(label => (
  <div key={label.id} className="bg-card border border-border p-3 rounded-2xl shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden text-foreground">
 <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: label.color }} />
 <div className="flex justify-between items-start ml-2">
 <div>
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium border"
 style={{ backgroundColor: `${label.color}15`, color: label.color, borderColor: `${label.color}30` }}>
 {label.name}
 </span>
 {label.aiPrompt && (
 <div className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
 <Wand2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
 <p className="line-clamp-2" title={label.aiPrompt}>{label.aiPrompt}</p>
 </div>
 )}
 </div>
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button 
   onClick={() => handleSyncAi(label.id)} 
   disabled={!label.aiPrompt || syncingId === label.id}
   className="p-1.5 text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50"
   title={language === 'en' ? 'Sync to AI Training' : 'এআই ট্রেনিং এ সিঙ্ক করুন'}
 >
   {syncingId === label.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
 </button>
 <button onClick={() => startEdit(label)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
 <Edit2 className="w-3.5 h-3.5" />
 </button>
 <button onClick={() => handleDelete(label.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
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
