'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { Wand2, Check, RefreshCw } from 'lucide-react';

interface LabelFormProps {
  initialData?: { id?: string; name: string; color: string; aiPrompt?: string };
  onSave: (data: { name: string; color: string; aiPrompt?: string }, id?: string) => Promise<void>;
  onCancel: () => void;
}

export default function LabelForm({ initialData, onSave, onCancel }: LabelFormProps) {
  const { language } = useLanguage();
  const [name, setName] = useState(initialData?.name || '');
  const [color, setColor] = useState(initialData?.color || '#3b82f6');
  const [aiPrompt, setAiPrompt] = useState(initialData?.aiPrompt || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setColor(initialData.color || '#3b82f6');
      setAiPrompt(initialData.aiPrompt || '');
    }
  }, [initialData]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave({ name, color, aiPrompt }, initialData?.id);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm animate-in zoom-in-95 duration-200">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-slate-700">
              {language === 'en' ? 'Label Name' : 'লেবেলের নাম'}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-1.5 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-[13px]"
              placeholder={language === 'en' ? "e.g. VIP, Urgent, Support" : "যেমন: VIP, Urgent"}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-slate-700">
              {language === 'en' ? 'Color' : 'রং'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-10 h-10 p-1 border border-slate-200 rounded-xl cursor-pointer bg-slate-50"
              />
              <input
                type="text"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="flex-1 px-1.5 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-[13px] font-mono"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
            <Wand2 className="w-3.5 h-3.5 text-purple-500" />
            {language === 'en' ? 'Auto AI Tagging Prompt (Optional)' : 'অটো এআই ট্যাগিং প্রম্পট (ঐচ্ছিক)'}
          </label>
          <textarea
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            rows={2}
            className="w-full px-1.5 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none text-[13px]"
            placeholder={language === 'en' ? "e.g. Apply this label if the customer asks about pricing." : "যেমন: যদি কাস্টমার দাম জানতে চায়, তবে এই লেবেলটি দিবে।"}
          />
          <p className="text-[11px] text-slate-500">
            {language === 'en' ? 'The AI will read this instruction and automatically apply the label to matching conversations.' : 'এআই এই ইনস্ট্রাকশন পড়বে এবং মিলে গেলে অটোমেটিক চ্যাটে এই লেবেল বসিয়ে দিবে।'}
          </p>
        </div>

        <div className="flex items-center justify-end gap-1.5 pt-4 border-t border-slate-100 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium text-[13px]"
          >
            {language === 'en' ? 'Cancel' : 'বাতিল'}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 font-medium text-[13px] shadow-md"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {language === 'en' ? 'Save Label' : 'লেবেল সেভ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}
