'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { X, Sparkles, MessageSquare, AlertTriangle, ShieldCheck, CheckCircle2, XCircle, RefreshCw, HelpCircle, Lock } from 'lucide-react';
import InstructionBanner from '@/components/InstructionBanner';
import { useFeature } from '@/hooks/useFeature';

interface CommentConfigModalProps {
  channel: any;
  onClose: () => void;
  onRefresh: () => void;
  language: string;
  API: string;
}

export default function CommentConfigModal({
  channel,
  onClose,
  onRefresh,
  language,
  API,
}: CommentConfigModalProps) {
  const hasFeature = useFeature('facebook_comment_automation');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [isCommentAutoReplyEnabled, setIsCommentAutoReplyEnabled] = useState(false);
  const [commentReplyMode, setCommentReplyMode] = useState<'public' | 'private' | 'both'>('public');
  const [commentKeywords, setCommentKeywords] = useState<string>('');
  const [useKeywordFilter, setUseKeywordFilter] = useState<boolean>(false);
  const [commentInstruction, setCommentInstruction] = useState<string>('');
  const [excludedPostIds, setExcludedPostIds] = useState<string>('');
  const [hasCommentPermissions, setHasCommentPermissions] = useState<boolean>(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/channels/messenger/connections/${channel.id}/comment-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsCommentAutoReplyEnabled(!!data.isCommentAutoReplyEnabled);
        setCommentReplyMode(data.commentReplyMode || 'public');
        const kws = data.commentKeywords || [];
        setCommentKeywords(kws.join(', '));
        setUseKeywordFilter(kws.length > 0);
        setCommentInstruction(data.commentInstruction || '');
        setExcludedPostIds((data.excludedPostIds || []).join(', '));
        setHasCommentPermissions(data.hasCommentPermissions ?? true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load comment settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [channel.id]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const token = Cookies.get('access_token');
      const keywordsArray = useKeywordFilter
        ? commentKeywords.split(',').map((k) => k.trim()).filter(Boolean)
        : [];
      const excludedPostsArray = excludedPostIds
        ? excludedPostIds.split(',').map((id) => id.trim()).filter(Boolean)
        : [];

      const res = await fetch(`${API}/channels/messenger/connections/${channel.id}/comment-settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isCommentAutoReplyEnabled,
          commentReplyMode,
          commentKeywords: keywordsArray,
          commentInstruction,
          excludedPostIds: excludedPostsArray,
        }),
      });

      if (res.ok) {
        toast.success(
          language === 'en' ? 'Comment settings saved successfully' : 'কমেন্ট সেটিংস সফলভাবে সেভ হয়েছে'
        );
        onRefresh();
        onClose();
      } else {
        toast.error('Failed to save comment settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-surface/90 border border-surface-hover rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface/70 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>{language === 'en' ? 'Facebook Comment Automation' : 'ফেসবুক কমেন্ট অটোমেশন'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  ZiniChat
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'en'
                  ? 'Automate replies to post comments using AI and deduct 1 AI credit per response.'
                  : 'এআই ব্যবহার করে ফেসবুক পোস্টের কমেন্টে স্বয়ংক্রিয় উত্তর দিন (প্রতি উত্তর ১টি এআই ক্রেডিট)।'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner if Token Lacks Permissions */}
        {!hasCommentPermissions && (
          <div className="px-5 pt-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {language === 'en'
                  ? 'Your page token lacks pages_read_engagement or pages_manage_engagement permissions. Please reconnect your page to enable comment automation.'
                  : 'আপনার পেজে কমেন্ট পড়ার ও পোস্ট করার মেটা পারমিশন নেই। "ইনবক্স যুক্ত করুন" এ গিয়ে পেজটি পুনরায় কানেক্ট করুন।'}
              </span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="p-12 flex justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {!hasFeature && (
                <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-400 text-xs flex items-start gap-2.5">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-300 mb-0.5">
                      {language === 'en' ? 'Feature Locked in Current Package Plan' : 'বর্তমান প্যাকেজ প্ল্যানে এই ফিচারটি অন্তর্ভুক্ত নেই'}
                    </h4>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      {language === 'en'
                        ? 'Facebook Comment Automation is not included in your active subscription package. Please upgrade your plan or contact support.'
                        : 'ফেসবুক কমেন্ট অটোমেশন ফিচারটি আপনার সক্রিয় প্যাকেজে নেই। এটি চালু করতে প্ল্যান আপগ্রেড করুন বা অ্যাডমিনের সাথে যোগাযোগ করুন।'}
                    </p>
                  </div>
                </div>
              )}

              <InstructionBanner
                title={language === 'en' ? 'Facebook Comment Automation Guide' : 'ফেসবুক কমেন্ট অটোমেশন ব্যবহার বিধি'}
                description={language === 'en'
                  ? 'By default, AI automatically responds to new comments on ALL posts. No post ID input is required. Use the controls below to toggle reply modes, set keyword filters, or customize AI tone.'
                  : 'ডিফল্টভাবে সিস্টেম পেজের সব নতুন পোস্টের কমেন্টে অটোমেটিক রিপ্লাই দেবে। কোনো ফিল্ডেই পোস্ট আইডি ইনপুট দেওয়ার প্রয়োজন নেই। সাধারণ ব্যবহারে নিচের অপশনগুলো অপরিবর্তিত রাখলেই চলবে।'}
                variant="purple"
              />

              {/* Enable Toggle Switch */}
              <div className="p-4 bg-muted/20 border border-border rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    {language === 'en' ? 'Enable Comment Auto-Reply' : 'কমেন্ট অটো-রিপ্লাই চালু করুন'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {language === 'en'
                      ? 'AI will automatically process and respond to comments on your page posts.'
                      : 'এটি চালু থাকলে পেজের পোস্ট কমেন্টে এআই স্বয়ংক্রিয়ভাবে উত্তর প্রদান করবে।'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCommentAutoReplyEnabled(!isCommentAutoReplyEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                    isCommentAutoReplyEnabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                      isCommentAutoReplyEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Reply Mode Options */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  {language === 'en' ? 'Reply Mode' : 'রিপ্লাই মোড'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'public',
                      title: language === 'en' ? 'Public Comment Only' : 'পাবলিক কমেন্ট রিপ্লাই',
                      desc: language === 'en' ? 'Replies publicly on post' : 'পোস্টের নিচে সবার সামনে রিপ্লাই দেবে',
                      icon: MessageSquare,
                    },
                    {
                      id: 'private',
                      title: language === 'en' ? 'Private Message Only' : 'মেসেঞ্জার ইনবক্স প্রাইভেট',
                      desc: language === 'en' ? 'Private Messenger reply (7 days limit)' : 'কাস্টমারের ইনবক্সে সরাসরি মেসেজ পাঠাবে',
                      icon: MessageSquare,
                    },
                    {
                      id: 'both',
                      title: language === 'en' ? 'Public & Private Both' : 'পাবলিক + ইনবক্স মেসেজ',
                      desc: language === 'en' ? 'Public reply + Messenger inbox' : 'কমেন্ট রিপ্লাই ও ইনবক্স দুটোই একসাথে',
                      icon: MessageSquare,
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setCommentReplyMode(mode.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer font-sans ${
                        commentReplyMode === mode.id
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      <h4 className="text-xs font-bold text-foreground">{mode.title}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{mode.desc}</p>
                    </button>
                  ))}
                </div>
                {commentReplyMode === 'public' && (
                  <p className="text-[10px] text-emerald-400 mt-1 italic">
                    ℹ️ {language === 'en'
                      ? 'Note: Selecting "Public Comment Only" leaves your 1-on-1 direct Messenger inbox messaging 100% active separately.'
                      : 'নোট: "পাবলিক কমেন্ট রিপ্লাই" নির্বাচন করলেও গ্রাহকের স্বাভাবিক মেসেঞ্জার ইনবক্স চ্যাট সম্পূর্ণ চালু থাকবে।'}
                  </p>
                )}
              </div>

              {/* Trigger Keyword Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  {language === 'en' ? 'Trigger Keyword Filter' : 'কিওয়ার্ড ফিল্টার (ঐচ্ছিক)'}
                </label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="keywordMode"
                      checked={!useKeywordFilter}
                      onChange={() => setUseKeywordFilter(false)}
                      className="accent-primary"
                    />
                    <span>{language === 'en' ? 'Reply to All Comments' : 'সব কমেন্টে অটো-রিপ্লাই দিন'}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="keywordMode"
                      checked={useKeywordFilter}
                      onChange={() => setUseKeywordFilter(true)}
                      className="accent-primary"
                    />
                    <span>{language === 'en' ? 'Filter by Keywords' : 'নির্দিষ্ট কিওয়ার্ড থাকলে উত্তর দিন'}</span>
                  </label>
                </div>

                {useKeywordFilter && (
                  <input
                    type="text"
                    value={commentKeywords}
                    onChange={(e) => setCommentKeywords(e.target.value)}
                    placeholder={
                      language === 'en'
                        ? 'e.g., price, dam, inbox, details, stock'
                        : 'যেমন: দাম, price, inbox, কত, বিবরণ'
                    }
                    className="w-full p-2.5 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                )}
              </div>

              {/* Excluded Post IDs */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>{language === 'en' ? 'Excluded Post IDs (Optional)' : 'যেসব পোস্টে রিপ্লাই বন্ধ থাকবে (Excluded Post IDs)'}</span>
                </label>
                <input
                  type="text"
                  value={excludedPostIds}
                  onChange={(e) => setExcludedPostIds(e.target.value)}
                  placeholder={
                    language === 'en'
                      ? 'Comma-separated Facebook Post IDs (e.g. 1020304050, 6070809010)'
                      : 'কমা দিয়ে ফেসবুক পোস্ট আইডি লিখুন (যেমন: 1020304050, 6070809010)'
                  }
                  className="w-full p-2.5 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-[10px] text-muted-foreground">
                  {language === 'en'
                    ? 'Comments on these specific post IDs will be ignored by auto-reply. Leave blank for all posts.'
                    : 'ডিফল্টভাবে ফাঁকা রাখুন। যেসব পোস্টে অটো-রিপ্লাই দিতে চান না কেবল সেগুলোর পোস্ট আইডি এখানে দিন।'}
                </p>
              </div>

              {/* Custom AI Instruction */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {language === 'en' ? 'Custom Comment Prompt Instruction' : 'কমেন্টের জন্য কাস্টম এআই গাইডলাইন'}
                </label>
                <textarea
                  value={commentInstruction}
                  onChange={(e) => setCommentInstruction(e.target.value)}
                  rows={3}
                  placeholder={
                    language === 'en'
                      ? 'e.g., Keep replies under 2 sentences. Always ask them to check inbox for prices.'
                      : 'যেমন: উত্তর ১-২ লাইনের মধ্যে রাখুন এবং বিস্তারিত দামের জন্য ইনবক্স চেক করতে বলুন।'
                  }
                  className="w-full p-2.5 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-surface/70 backdrop-blur-xl flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>⚡ 1 AI Response credit deducted per successful reply</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl transition-colors cursor-pointer"
            >
              {language === 'en' ? 'Cancel' : 'বাতিল'}
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : language === 'en' ? 'Save Settings' : 'সেটিংস সেভ করুন'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
