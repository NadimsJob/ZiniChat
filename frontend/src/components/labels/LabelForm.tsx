'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { Wand2, Check, RefreshCw } from 'lucide-react';

interface LabelFormProps {
  initialData?: { id?: string; name: string; color: string; aiPrompt?: string; description?: string; isActive?: boolean };
  onSave: (data: { name: string; color: string; aiPrompt?: string; description?: string; isActive?: boolean }, id?: string) => Promise<void>;
  onCancel: () => void;
}

export default function LabelForm({ initialData, onSave, onCancel }: LabelFormProps) {
  const { language } = useLanguage();
  const [name, setName] = useState(initialData?.name || '');
  const [color, setColor] = useState(initialData?.color || '#3b82f6');
  const [aiPrompt, setAiPrompt] = useState(initialData?.aiPrompt || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isActive, setIsActive] = useState(initialData?.isActive !== undefined ? initialData.isActive : true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setColor(initialData.color || '#3b82f6');
      setAiPrompt(initialData.aiPrompt || '');
      setDescription(initialData.description || '');
      setIsActive(initialData.isActive !== undefined ? initialData.isActive : true);
    }
  }, [initialData]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave({ name, color, aiPrompt, description, isActive }, initialData?.id);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm animate-in zoom-in-95 duration-200 text-foreground">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-foreground block">
                {language === 'en' ? 'Tag Name' : 'ট্যাগের নাম'}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2.5 md:py-1.5 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary outline-none transition-all text-[16px] md:text-[12px]"
                placeholder={language === 'en' ? "e.g. VIP, Urgent, Support" : "যেমন: VIP, Urgent"}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-foreground block">
                {language === 'en' ? 'Color' : 'রং'}
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-5 h-5 p-0 border border-border rounded-full cursor-pointer bg-background overflow-hidden shrink-0 ml-auto"
                  title="Custom Color"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-foreground block">
                {language === 'en' ? 'Description (Optional)' : 'বিবরণ (ঐচ্ছিক)'}
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2.5 md:py-1.5 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary outline-none transition-all text-[16px] md:text-[12px]"
                placeholder={language === 'en' ? "e.g. For VIP buyers" : "যেমন: ভিআইপি ক্রেতাদের জন্য"}
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <label className="text-[12px] font-medium text-foreground block">
                  {language === 'en' ? 'Status (Enabled)' : 'স্ট্যাটাস (সক্রিয়)'}
                </label>
                <span className="text-[10px] text-muted-foreground block font-sans">
                  {language === 'en' ? 'AI will ignore disabled tags' : 'অফ থাকলে এআই এই ট্যাগ রিড করবে না'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[12px] font-medium text-foreground">
            <Wand2 className="w-3.5 h-3.5 text-purple-500" />
            {language === 'en' ? 'Auto AI Tagging Prompt (Optional)' : 'অটো এআই ট্যাগিং প্রম্পট (ঐচ্ছিক)'}
          </label>
          <textarea
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            rows={2}
            className="w-full px-3 py-3 md:py-2 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none text-[16px] md:text-[12px]"
            placeholder={language === 'en' ? "e.g. Apply this tag if the customer asks about pricing." : "যেমন: যদি কাস্টমার দাম জানতে চায়, তবে এই ট্যাগটি দিবে।"}
          />
          <p className="text-[11px] text-muted-foreground font-sans">
            {language === 'en' ? 'The AI will read this instruction and automatically apply the tag to matching conversations.' : 'এআই এই ইনস্ট্রাকশন পড়বে এবং মিলে গেলে অটোমেটিক চ্যাটে এই ট্যাগ বসিয়ে দিবে।'}
          </p>
        </div>

        <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-border mt-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 md:py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors font-medium text-[14px] md:text-[12px]"
          >
            {language === 'en' ? 'Cancel' : 'বাতিল'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="px-4 py-2.5 md:py-1.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5 font-medium shadow-sm shadow-primary/20 text-[14px] md:text-[12px]"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {language === 'en' ? 'Save Tag' : 'ট্যাগ সেভ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}
