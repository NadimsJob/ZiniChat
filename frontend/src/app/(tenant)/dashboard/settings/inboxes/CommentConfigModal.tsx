'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { X, Sparkles, MessageSquare, AlertTriangle, ShieldCheck, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'settings' | 'logs'>('settings');
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

  // Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

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

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/channels/messenger/connections/${channel.id}/comment-logs?page=1&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [channel.id]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const token = Cookies.get('access_token');
      const keywordsArray = useKeywordFilter
        ? commentKeywords.split(',').map((k) => k.trim()).filter(Boolean)
        : [];
      const excludedPostsArray = excludedPostIds.split(',').map((p) => p.trim()).filter(Boolean);

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
          language === 'en'
            ? 'Facebook Comment Settings saved successfully'
            : 'ফেসবুক কমেন্ট সেটিংস সফলভাবে সেভ হয়েছে'
        );
        onRefresh();
      } else {
        toast.error('Failed to save settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-card border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface/70 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>{language === 'en' ? 'Facebook Comment Automation' : 'ফেসবুক কমেন্ট অটোমেশন'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                  {channel.displayName || 'Facebook Page'}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                {language === 'en'
                  ? 'Automate replies to post comments using AI and deduct 1 AI credit per response.'
                  : 'এআই সহকারী দিয়ে ফেসবুক পোস্টের কমেন্টে অটোমেটিক রিপ্লাই চালু করুন।'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission Banner Warning */}
        {!hasCommentPermissions && (
          <div className="p-3.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-500 text-xs flex items-center gap-3 font-sans">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            <div className="flex-1">
              <span className="font-bold">
                {language === 'en' ? 'Re-permission Required: ' : 'পুনরায় পারমিশন প্রয়োজন: '}
              </span>
              <span>
                {language === 'en'
                  ? 'Your page token lacks pages_read_engagement or pages_manage_engagement permissions. Please reconnect your page to enable comment automation.'
                  : 'আপনার পেজে কমেন্ট পড়ার ও পোস্ট করার মেটা পারমিশন নেই। "ইনবক্স যুক্ত করুন" এ গিয়ে পেজটি পুনরায় কানেক্ট করুন।'}
              </span>
            </div>
          </div>
        )}

        {/* Modal Tabs */}
        <div className="flex border-b border-border bg-muted/30 px-4">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {language === 'en' ? 'Automation Settings' : 'অটোমেশন সেটিংস'}
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {language === 'en' ? 'Comment Activity Logs' : 'কমেন্ট হিস্ট্রি লগ'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="p-12 flex justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : activeTab === 'settings' ? (
            <>
              {/* Enable Switch Card */}
              <div className="p-4 bg-muted/20 rounded-xl border border-border flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    {language === 'en' ? 'Enable Comment Auto-Reply' : 'কমেন্ট অটো-রিপ্লাই চালু করুন'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {language === 'en'
                      ? 'AI will automatically respond to new comments on your Facebook Page posts.'
                      : 'পেজের পোস্টে নতুন কমেন্ট আসলে এআই স্বয়ংক্রিয়ভাবে উত্তর দেবে (১ ক্রেডিট ডিডাক্ট হবে)।'}
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

              {/* Reply Mode Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">
                  {language === 'en' ? 'Reply Mode' : 'রিপ্লাই মোড নির্বাচন'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCommentReplyMode('public')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      commentReplyMode === 'public'
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border bg-card text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <div className="text-xs font-bold">{language === 'en' ? 'Public Comment Only' : 'কেবল পাবলিক কমেন্ট'}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">{language === 'en' ? 'Replies publicly on post' : 'কমেন্টের নিচে উত্তর দেবে'}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommentReplyMode('private')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      commentReplyMode === 'private'
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border bg-card text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <div className="text-xs font-bold">{language === 'en' ? 'Private Message Only' : 'কেবল মেসেঞ্জার ইনবক্স'}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">{language === 'en' ? 'Private Messenger reply (7 days limit)' : 'সরাসরি ইনবক্সে প্রাইভেট মেসেজ'}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommentReplyMode('both')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      commentReplyMode === 'both'
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border bg-card text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <div className="text-xs font-bold">{language === 'en' ? 'Public & Private Both' : 'পাবলিক + ইনবক্স দুটোই'}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">{language === 'en' ? 'Public reply + Messenger inbox' : 'কমেন্ট রিপ্লাই ও ইনবক্স মেসেজ'}</div>
                  </button>
                </div>
              </div>

              {/* Keyword Filters */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">
                  {language === 'en' ? 'Trigger Keyword Filter' : 'কিওয়ার্ড ফিল্টার রুলস'}
                </label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-foreground">
                    <input
                      type="radio"
                      name="keyword_mode"
                      checked={!useKeywordFilter}
                      onChange={() => setUseKeywordFilter(false)}
                      className="text-primary focus:ring-primary"
                    />
                    <span>{language === 'en' ? 'Reply to All Comments' : 'সকল কমেন্টে উত্তর দাও'}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-foreground">
                    <input
                      type="radio"
                      name="keyword_mode"
                      checked={useKeywordFilter}
                      onChange={() => setUseKeywordFilter(true)}
                      className="text-primary focus:ring-primary"
                    />
                    <span>{language === 'en' ? 'Filter by Keywords' : 'নির্দিষ্ট কিওয়ার্ড থাকলে উত্তর দাও'}</span>
                  </label>
                </div>

                {useKeywordFilter && (
                  <input
                    type="text"
                    value={commentKeywords}
                    onChange={(e) => setCommentKeywords(e.target.value)}
                    placeholder="e.g. price, dam, details, inbox, stock"
                    className="w-full p-2.5 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                )}
              </div>

              {/* Excluded Post IDs */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {language === 'en' ? 'Excluded Post IDs (Optional)' : 'বাদ দেওয়া পোস্ট আইডি (ঐচ্ছিক)'}
                </label>
                <input
                  type="text"
                  value={excludedPostIds}
                  onChange={(e) => setExcludedPostIds(e.target.value)}
                  placeholder="Comma-separated Facebook Post IDs (e.g. 1020304050, 6070809010)"
                  className="w-full p-2.5 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-[10px] text-muted-foreground">
                  {language === 'en'
                    ? 'Comments on these posts will be ignored by auto-reply.'
                    : 'এই পোস্টগুলোতে আসা কমেন্ট ইগনোর করা হবে।'}
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
          ) : (
            /* Logs Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground">
                  {language === 'en' ? 'Recent Comment Automation Activity' : 'সাম্প্রতিক কমেন্ট অটোমেশন কার্যক্রম'}
                </h3>
                <button
                  onClick={fetchLogs}
                  className="p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  title="Refresh Logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {logsLoading ? (
                <div className="p-8 flex justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  {language === 'en' ? 'No comment automation logs found yet.' : 'এখনো কোনো কমেন্ট ইতিহাস পাওয়া যায়নি।'}
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-muted/20 border border-border rounded-xl space-y-1.5 text-xs font-sans"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <span>{log.userName || 'User'}</span>
                          <span className="text-[10px] text-muted-foreground">({new Date(log.createdAt).toLocaleString()})</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                            log.replyStatus === 'replied'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : log.replyStatus === 'skipped'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {log.replyStatus === 'replied' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Replied (1 Credit)
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" /> {log.replyStatus.toUpperCase()} ({log.skipReason || 'Skipped'})
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Comment: </span>"{log.commentText}"
                      </p>
                      {log.replyText && (
                        <p className="text-emerald-400">
                          <span className="font-semibold text-foreground">AI Reply: </span>"{log.replyText}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab === 'settings' && (
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
        )}
      </div>
    </div>
  );
}
