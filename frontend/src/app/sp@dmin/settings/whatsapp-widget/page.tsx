'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { useLanguage } from '@/components/LanguageProvider';
import {
  MessageSquare,
  Save,
  RefreshCw,
  Upload,
  Trash2,
  ExternalLink,
  Check,
  Smartphone,
  Eye,
  Sliders,
  Palette,
  HelpCircle
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface WhatsappWidgetConfig {
  enabled: boolean;
  phoneNumber: string;
  buttonColor: string;
  customIconUrl: string | null;
  prefilledText: string;
  position: 'bottom-right' | 'bottom-left';
  tooltipTextEn: string;
  tooltipTextBn: string;
}

const PRESET_COLORS = [
  { name: 'Brand Green', hex: '#1F824A' },
  { name: 'Official WhatsApp Green', hex: '#25D366' },
  { name: 'Teal Green', hex: '#128C7E' },
  { name: 'Dark Green', hex: '#075E54' },
  { name: 'Bright Emerald', hex: '#00E676' },
  { name: 'Brand Orange', hex: '#EE8D27' },
  { name: 'Deep Cyan', hex: '#0EA5E9' },
];

export default function WhatsappWidgetSettingsPage() {
  const { language } = useLanguage();
  const token = Cookies.get('access_token');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const [config, setConfig] = useState<WhatsappWidgetConfig>({
    enabled: true,
    phoneNumber: '8801533894967',
    buttonColor: '#1F824A',
    customIconUrl: null,
    prefilledText: 'Hello ZiniChat! I have a question.',
    position: 'bottom-right',
    tooltipTextEn: 'Need Help? Chat on WhatsApp',
    tooltipTextBn: 'সাহায্য লাগবে? হোয়াটসঅ্যাপে চ্যাট করুন',
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/landing-page/config`);
      if (res.ok) {
        const data = await res.json();
        if (data.whatsappWidgetJson) {
          setConfig({
            enabled: data.whatsappWidgetJson.enabled ?? true,
            phoneNumber: data.whatsappWidgetJson.phoneNumber || '8801533894967',
            buttonColor: data.whatsappWidgetJson.buttonColor || '#1F824A',
            customIconUrl: data.whatsappWidgetJson.customIconUrl || null,
            prefilledText: data.whatsappWidgetJson.prefilledText || '',
            position: data.whatsappWidgetJson.position || 'bottom-right',
            tooltipTextEn: data.whatsappWidgetJson.tooltipTextEn || 'Need Help? Chat on WhatsApp',
            tooltipTextBn: data.whatsappWidgetJson.tooltipTextBn || 'সাহায্য লাগবে? হোয়াটসঅ্যাপে চ্যাট করুন',
          });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(language === 'en' ? 'Failed to load widget config' : 'উইজেট কনফিগ লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Clean phone number (strip leading +, spaces, dashes)
      let cleanedPhone = config.phoneNumber.replace(/[\s\-\+\(\)]/g, '');
      if (cleanedPhone.startsWith('0')) {
        cleanedPhone = '88' + cleanedPhone;
      }

      const updatedConfig = {
        ...config,
        phoneNumber: cleanedPhone,
      };

      const res = await fetch(`${API}/landing-page/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          whatsappWidgetJson: updatedConfig,
        }),
      });

      if (res.ok) {
        setConfig(updatedConfig);
        toast.success(
          language === 'en'
            ? 'WhatsApp Widget settings updated successfully!'
            : 'হোয়াটসঅ্যাপ উইজেট সেটিংস সফলভাবে আপগ্রেড হয়েছে!'
        );
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (language === 'en' ? 'Error saving settings' : 'সেটিংস সেভ করতে সমস্যা হয়েছে'));
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingIcon(true);
    try {
      const res = await fetch(`${API}/landing-page/upload-widget-icon`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({ ...prev, customIconUrl: data.iconUrl }));
        toast.success(
          language === 'en' ? 'Custom icon uploaded successfully!' : 'কাস্টম আইকন সফলভাবে আপলোড হয়েছে!'
        );
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error(err);
      toast.error(language === 'en' ? 'Failed to upload icon' : 'আইকন আপলোড করতে ব্যর্থ হয়েছে');
    } finally {
      setUploadingIcon(false);
    }
  };

  // Helper for generating wa.me link
  const getFormattedPhone = () => {
    let clean = config.phoneNumber.replace(/[\s\-\+\(\)]/g, '');
    if (clean.startsWith('0')) clean = '88' + clean;
    return clean;
  };

  const getWaUrl = () => {
    const phone = getFormattedPhone();
    let url = `https://wa.me/${phone}`;
    if (config.prefilledText) {
      url += `?text=${encodeURIComponent(config.prefilledText)}`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-[#1F824A] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface/70 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#1F824A]/20 text-[#1F824A] rounded-xl border border-[#1F824A]/30">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {language === 'en' ? 'WhatsApp Floating Widget' : 'হোয়াটসঅ্যাপ ফ্লোটিং উইজেট'}
            </h1>
            <p className="text-[12px] text-zinc-400">
              {language === 'en'
                ? 'Configure direct WhatsApp redirection button on landing page & website.'
                : 'ওয়েবসাইট ও ল্যান্ডিং পেজে সরাসরি হোয়াটসঅ্যাপ রিডাইরেকশন বাটন কাস্টমাইজ করুন।'}
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1F824A] hover:bg-[#18683B] text-white rounded-xl font-medium transition duration-200 shadow-lg shadow-[#1F824A]/20 text-xs sm:text-sm disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {language === 'en' ? 'Save Settings' : 'সেটিংস সেভ করুন'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Config Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Controls Card */}
          <div className="bg-surface/70 backdrop-blur-xl border border-white/10 p-5 rounded-2xl space-y-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Sliders className="w-4 h-4 text-[#EE8D27]" />
              {language === 'en' ? 'Widget Configuration' : 'উইজেট কনফিগারেশন'}
            </h2>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
              <div>
                <p className="text-sm font-medium text-white">
                  {language === 'en' ? 'Enable Floating Widget' : 'ফ্লোটিং উইজেট সচল করুন'}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {language === 'en'
                    ? 'Show floating WhatsApp button to all website visitors'
                    : 'ওয়েবসাইটের ভিজিটরদের হোয়াটসঅ্যাপ বাটন প্রদর্শন করুন'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1F824A]"></div>
              </label>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                <span>{language === 'en' ? 'WhatsApp Phone Number' : 'হোয়াটসঅ্যাপ ফোন নম্বর'}</span>
                <span className="text-[10px] text-zinc-500">Format: 8801533894967</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={config.phoneNumber}
                  onChange={e => setConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="e.g. 8801533894967"
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#1F824A] transition"
                />
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-1">
                <span>Redirect Link:</span>
                <a
                  href={getWaUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0EA5E9] hover:underline font-mono text-[11px] inline-flex items-center gap-1"
                >
                  {getWaUrl()}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            {/* Prefilled Text Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                {language === 'en' ? 'Prefilled Message (Optional)' : 'পূর্বনির্ধারিত মেসেজ (ঐচ্ছিক)'}
              </label>
              <textarea
                value={config.prefilledText}
                onChange={e => setConfig(prev => ({ ...prev, prefilledText: e.target.value }))}
                rows={2}
                placeholder="e.g. Hello ZiniChat! I have a question."
                className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#1F824A] transition"
              />
              <p className="text-[10px] text-zinc-500">
                {language === 'en'
                  ? 'Message pre-filled in customer WhatsApp chat window when clicked.'
                  : 'কাস্টমার বাটনে ক্লিক করলে হোয়াটসঅ্যাপ বক্সে এই বার্তাটি লেখা থাকবে।'}
              </p>
            </div>

            {/* Position Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                {language === 'en' ? 'Screen Position' : 'পজিশন নির্বাচন'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, position: 'bottom-right' }))}
                  className={`p-3 rounded-xl border text-xs font-medium text-center transition ${
                    config.position === 'bottom-right'
                      ? 'bg-[#1F824A]/20 border-[#1F824A] text-white'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'
                  }`}
                >
                  {language === 'en' ? 'Bottom Right (Default)' : 'নিচে ডানদিকে (ডিফল্ট)'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, position: 'bottom-left' }))}
                  className={`p-3 rounded-xl border text-xs font-medium text-center transition ${
                    config.position === 'bottom-left'
                      ? 'bg-[#1F824A]/20 border-[#1F824A] text-white'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'
                  }`}
                >
                  {language === 'en' ? 'Bottom Left' : 'নিচে বামদিকে'}
                </button>
              </div>
            </div>

            {/* Tooltip Texts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  {language === 'en' ? 'Hover Tooltip (English)' : 'টুলটিপ টেক্সট (ইংরেজি)'}
                </label>
                <input
                  type="text"
                  value={config.tooltipTextEn}
                  onChange={e => setConfig(prev => ({ ...prev, tooltipTextEn: e.target.value }))}
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1F824A]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  {language === 'en' ? 'Hover Tooltip (Bangla)' : 'টুলটিপ টেক্সট (বাংলা)'}
                </label>
                <input
                  type="text"
                  value={config.tooltipTextBn}
                  onChange={e => setConfig(prev => ({ ...prev, tooltipTextBn: e.target.value }))}
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1F824A]"
                />
              </div>
            </div>
          </div>

          {/* Styling & Icon Customization Card */}
          <div className="bg-surface/70 backdrop-blur-xl border border-white/10 p-5 rounded-2xl space-y-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Palette className="w-4 h-4 text-[#1F824A]" />
              {language === 'en' ? 'Button Styling & Custom Icon' : 'বাটন স্টাইলিং ও আইকন'}
            </h2>

            {/* Color Customization */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                <span>{language === 'en' ? 'Button Color' : 'বাটন কালার'}</span>
                <span className="font-mono text-zinc-400 text-xs">{config.buttonColor}</span>
              </label>

              {/* Color Presets */}
              <div className="flex flex-wrap items-center gap-2.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, buttonColor: c.hex }))}
                    className="group relative w-8 h-8 rounded-full border-2 transition transform hover:scale-110 flex items-center justify-center"
                    style={{
                      backgroundColor: c.hex,
                      borderColor: config.buttonColor === c.hex ? '#ffffff' : 'transparent',
                    }}
                    title={c.name}
                  >
                    {config.buttonColor === c.hex && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </button>
                ))}

                {/* Custom Color Input */}
                <div className="relative inline-flex items-center gap-2 ml-2">
                  <input
                    type="color"
                    value={config.buttonColor}
                    onChange={e => setConfig(prev => ({ ...prev, buttonColor: e.target.value }))}
                    className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border border-white/20 p-0.5"
                  />
                  <span className="text-[11px] text-zinc-400">{language === 'en' ? 'Custom Color' : 'কাস্টম কালার'}</span>
                </div>
              </div>
            </div>

            {/* Custom Icon Upload */}
            <div className="space-y-3 border-t border-white/10 pt-4">
              <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                <span>{language === 'en' ? 'Widget Icon' : 'উইজেট আইকন'}</span>
                <span className="text-[10px] text-zinc-500">
                  {config.customIconUrl ? 'Using Custom Icon' : 'Using Default WhatsApp Vector Icon'}
                </span>
              </label>

              <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                {/* Icon Preview */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 shadow-md"
                  style={{ backgroundColor: config.buttonColor }}
                >
                  {config.customIconUrl ? (
                    <img
                      src={`${API}${config.customIconUrl}`}
                      alt="Custom Icon"
                      className="w-7 h-7 object-contain rounded-full"
                    />
                  ) : (
                    <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <p className="text-xs font-medium text-white">
                    {config.customIconUrl ? 'Custom Icon Active' : 'Default WhatsApp Icon'}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {language === 'en'
                      ? 'Upload custom logo/icon or keep WhatsApp brand icon'
                      : 'কাস্টম লোগো আপলোড করতে পারেন অথবা ডিফল্ট আইকন রাখতে পারেন'}
                  </p>
                </div>

                {/* Upload Button */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium cursor-pointer transition">
                    {uploadingIcon ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#EE8D27]" />
                    )}
                    <span>{language === 'en' ? 'Upload' : 'আপলোড'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingIcon}
                    />
                  </label>

                  {config.customIconUrl && (
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, customIconUrl: null }))}
                      className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
                      title="Reset to default icon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Interactive Live Preview */}
        <div className="space-y-6">
          <div className="bg-surface/70 backdrop-blur-xl border border-white/10 p-5 rounded-2xl sticky top-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center justify-between border-b border-white/10 pb-3">
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#0EA5E9]" />
                {language === 'en' ? 'Live Interactive Preview' : 'লাইভ প্রিভিউ'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                {config.enabled ? 'Active' : 'Disabled'}
              </span>
            </h3>

            {/* Mock Phone / Web Frame */}
            <div className="relative h-96 bg-gradient-to-b from-zinc-950 to-zinc-900 rounded-xl border border-white/10 overflow-hidden flex flex-col justify-between p-4 shadow-inner">
              {/* Web Header Mock */}
              <div className="flex items-center justify-between text-zinc-500 text-[10px] pb-2 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/60"></div>
                  <div className="w-2 h-2 rounded-full bg-amber-500/60"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500/60"></div>
                  <span className="ml-1 font-mono text-[9px] text-zinc-400">zinichat.com</span>
                </div>
                <Smartphone className="w-3 h-3 text-zinc-500" />
              </div>

              {/* Sample Content */}
              <div className="space-y-2 text-center py-6">
                <div className="w-10 h-10 mx-auto rounded-full bg-[#1F824A]/20 flex items-center justify-center text-[#1F824A] font-bold text-xs">
                  ZC
                </div>
                <p className="text-xs font-medium text-zinc-300">ZiniChat Platform</p>
                <p className="text-[10px] text-zinc-500 max-w-[180px] mx-auto">
                  Sample landing page representation
                </p>
              </div>

              {/* Mock Floating Widget inside Preview */}
              {config.enabled && (
                <div
                  className={`absolute bottom-4 ${
                    config.position === 'bottom-left' ? 'left-4' : 'right-4'
                  } flex items-center gap-2`}
                >
                  {/* Tooltip text bubble preview */}
                  <div className="hidden sm:flex items-center bg-zinc-900/90 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl border border-white/10 whitespace-nowrap animate-bounce">
                    {language === 'bn' ? config.tooltipTextBn : config.tooltipTextEn}
                  </div>

                  {/* Button */}
                  <a
                    href={getWaUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative flex items-center justify-center w-12 h-12 rounded-full text-white shadow-2xl transition transform hover:scale-110 active:scale-95"
                    style={{ backgroundColor: config.buttonColor }}
                  >
                    {/* Ripple ring effect */}
                    <span
                      className="absolute -inset-1 rounded-full opacity-30 animate-ping"
                      style={{ backgroundColor: config.buttonColor }}
                    ></span>

                    {config.customIconUrl ? (
                      <img
                        src={`${API}${config.customIconUrl}`}
                        alt="WhatsApp"
                        className="w-6 h-6 object-contain rounded-full relative z-10"
                      />
                    ) : (
                      <svg className="w-6 h-6 fill-current relative z-10" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                    )}
                  </a>
                </div>
              )}
            </div>

            {/* Test Link Button */}
            <div className="pt-2 text-center">
              <a
                href={getWaUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#1F824A] hover:underline font-medium"
              >
                <span>{language === 'en' ? 'Test WhatsApp Redirection' : 'হোয়াটসঅ্যাপ লিংক টেস্ট করুন'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
