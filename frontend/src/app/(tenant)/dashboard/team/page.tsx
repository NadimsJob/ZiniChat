'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Cookies from 'js-cookie';
import {
  Users, Plus, Shield, ShieldCheck, Mail, X, Edit2, Trash2, Crown, Save,
  CheckCircle2, Lock, Wifi, LayoutDashboard, Megaphone, ShoppingCart, Settings,
  Brain, CreditCard, UserCog, Inbox
} from 'lucide-react';
import InstructionBanner from '@/components/InstructionBanner';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const MENU_PERMISSIONS = [
  { key: 'inbox',        label: 'Live Inbox',       labelBn: 'লাইভ ইনবক্স',    icon: Inbox },
  { key: 'leads',        label: 'Leads / CRM',      labelBn: 'লিডস / সিআরএম',  icon: UserCog },
  { key: 'broadcasts',   label: 'Broadcasts',       labelBn: 'ব্রডকাস্ট',       icon: Megaphone },
  { key: 'orders',       label: 'Orders',           labelBn: 'অর্ডার',           icon: ShoppingCart },
  { key: 'team',         label: 'Team',             labelBn: 'টিম',              icon: Users },
  { key: 'settings',     label: 'All Settings',     labelBn: 'সেটিংস',          icon: Settings },
  { key: 'ai_training',  label: 'AI Training',      labelBn: 'এআই ট্রেনিং',    icon: Brain },
  { key: 'subscription', label: 'Subscription',     labelBn: 'সাবস্ক্রিপশন',    icon: CreditCard },
];

export default function TeamPage() {
  const { language } = useLanguage();
  const [agents, setAgents] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [seatLimit, setSeatLimit] = useState(1);
  const [seatUsed, setSeatUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
    agentAccessMode: 'ALL_CHANNELS',
    assignedChannels: [] as string[],
    menuPermissions: ['inbox'] as string[],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('access_token');
      const [agentsRes, channelsRes] = await Promise.all([
        fetch(`${API}/tenant/team`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API}/channels`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.users || data);
        setSeatLimit(data.seatLimit ?? 1);
        setSeatUsed(data.seatUsed ?? (data.users?.length || 0));
      }
      if (channelsRes.ok) setChannels(await channelsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (agent: any = null) => {
    setError('');
    if (agent) {
      setEditingAgent(agent);
      setFormData({
        name: agent.name,
        email: agent.email,
        password: '',
        role: agent.role,
        agentAccessMode: agent.agentAccessMode || 'ALL_CHANNELS',
        assignedChannels: agent.channelAssignments?.map((c: any) => c.channelConnectionId) || [],
        menuPermissions: agent.permissions || ['inbox'],
      });
    } else {
      setEditingAgent(null);
      setFormData({
        name: '', email: '', password: '',
        role: 'agent', agentAccessMode: 'ALL_CHANNELS',
        assignedChannels: [], menuPermissions: ['inbox'],
      });
    }
    setIsModalOpen(true);
  };

  const toggleMenuPermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      menuPermissions: prev.menuPermissions.includes(key)
        ? prev.menuPermissions.filter(k => k !== key)
        : [...prev.menuPermissions, key]
    }));
  };

  const handleToggleChannel = (channelId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedChannels: prev.assignedChannels.includes(channelId)
        ? prev.assignedChannels.filter(id => id !== channelId)
        : [...prev.assignedChannels, channelId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const token = Cookies.get('access_token');
      const url = editingAgent ? `${API}/tenant/team/${editingAgent.id}` : `${API}/tenant/team`;
      const method = editingAgent ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save team member');
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'en' ? 'Remove this team member?' : 'এই টিম মেম্বারকে সরাতে চান?')) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/team/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Failed to delete');
        return;
      }
      fetchData();
    } catch (err) { console.error(err); }
  };

  const isSeatFull = seatUsed >= seatLimit && !editingAgent;

  const getPermissionsSummary = (agent: any) => {
    if (agent.role === 'admin' || agent.role === 'owner') return null;
    const perms: string[] = agent.permissions || [];
    if (perms.length === 0) return language === 'en' ? 'No access' : 'কোনো অ্যাক্সেস নেই';
    const labels = perms
      .slice(0, 2)
      .map(k => MENU_PERMISSIONS.find(m => m.key === k)?.[language === 'en' ? 'label' : 'labelBn'] || k)
      .join(', ');
    return perms.length > 2 ? `${labels} +${perms.length - 2}` : labels;
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-6xl mx-auto space-y-4">
      <InstructionBanner
        title={language === 'en' ? 'Team Management' : 'টিম ম্যানেজমেন্ট'}
        description={language === 'en'
          ? 'Add agents with custom menu & channel access. Admins get full access automatically.'
          : 'এজেন্টদের কাস্টম মেনু ও চ্যানেল অ্যাক্সেস দিন। অ্যাডমিন স্বয়ংক্রিয়ভাবে সম্পূর্ণ অ্যাক্সেস পাবে।'}
        icon={ShieldCheck}
        variant="emerald"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            {language === 'en' ? 'Team Management' : 'টিম ম্যানেজমেন্ট'}
          </h1>
          <p className="text-slate-500 text-[13px] mt-1">
            {language === 'en' ? 'Manage roles, menu permissions, and channel access.' : 'রোল, মেনু পারমিশন এবং চ্যানেল অ্যাক্সেস ম্যানেজ করুন।'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Seat usage badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border ${
            isSeatFull
              ? 'bg-red-50 border-red-200 text-red-600'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <Users className="w-3.5 h-3.5" />
            {seatUsed} / {seatLimit} {language === 'en' ? 'Members' : 'মেম্বার'}
          </div>

          <button
            onClick={() => openModal()}
            disabled={isSeatFull}
            title={isSeatFull ? (language === 'en' ? 'Seat limit reached. Upgrade your plan.' : 'সিট লিমিট পূর্ণ। প্ল্যান আপগ্রেড করুন।') : ''}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all shadow-md whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {language === 'en' ? 'Add Member' : 'মেম্বার যোগ করুন'}
          </button>
        </div>
      </div>

      {/* Team Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[12px] text-slate-500">
                  <th className="px-3 py-2 font-semibold">{language === 'en' ? 'Member' : 'মেম্বার'}</th>
                  <th className="px-3 py-2 font-semibold">{language === 'en' ? 'Role' : 'রোল'}</th>
                  <th className="px-3 py-2 font-semibold hidden md:table-cell">{language === 'en' ? 'Menu Access' : 'মেনু অ্যাক্সেস'}</th>
                  <th className="px-3 py-2 font-semibold hidden md:table-cell">{language === 'en' ? 'Channel Access' : 'চ্যানেল অ্যাক্সেস'}</th>
                  <th className="px-3 py-2 font-semibold text-right">{language === 'en' ? 'Actions' : 'অ্যাকশন'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[12px] uppercase shrink-0">
                          {agent.name.substring(0, 2)}
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-slate-800 flex items-center gap-1">
                            {agent.name}
                            {agent.role === 'owner' && <Crown className="w-3 h-3 text-amber-500" />}
                          </div>
                          <div className="text-[11px] text-slate-500">{agent.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {agent.role === 'owner' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[11px] font-bold">
                          <Crown className="w-3 h-3" /> Owner
                        </span>
                      ) : agent.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[11px] font-bold">
                          <ShieldCheck className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[11px] font-bold">
                          <Shield className="w-3 h-3" /> Agent
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      {agent.role === 'admin' || agent.role === 'owner' ? (
                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {language === 'en' ? 'Full Access' : 'সম্পূর্ণ অ্যাক্সেস'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-600">
                          {getPermissionsSummary(agent) || (language === 'en' ? 'No access' : 'কোনো অ্যাক্সেস নেই')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <span className="text-[11px] text-slate-600">
                        {agent.agentAccessMode === 'ASSIGNED_CHANNELS'
                          ? `${agent.channelAssignments?.length || 0} ${language === 'en' ? 'channel(s)' : 'চ্যানেল'}`
                          : (language === 'en' ? 'All Channels' : 'সব চ্যানেল')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {agent.role !== 'owner' && (
                          <>
                            <button
                              onClick={() => openModal(agent)}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(agent.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-[15px] font-bold text-slate-800">
                {editingAgent
                  ? (language === 'en' ? 'Edit Team Member' : 'মেম্বার এডিট করুন')
                  : (language === 'en' ? 'Add Team Member' : 'নতুন মেম্বার যোগ করুন')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-4">
              {error && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-600 text-[12px] rounded-xl">
                  {error}
                </div>
              )}

              <form id="agentForm" onSubmit={handleSubmit} className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    {language === 'en' ? 'Name' : 'নাম'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" required value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="John Doe"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    {language === 'en' ? 'Email' : 'ইমেইল'} {!editingAgent && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="email" required={!editingAgent} disabled={!!editingAgent}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-50"
                    placeholder="john@example.com"
                  />
                  {!editingAgent && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      {language === 'en' ? 'Login credentials will be sent to this email.' : 'লগইন ক্রেডেনশিয়াল এই ইমেইলে পাঠানো হবে।'}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    {language === 'en' ? 'Password (Optional)' : 'পাসওয়ার্ড (Optional)'}
                  </label>
                  <input
                    type="text" value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder={language === 'en' ? 'Leave blank to auto-generate' : 'ফাঁকা রাখলে অটো তৈরি হবে'}
                  />
                </div>

                {/* Role */}
                {(!editingAgent || editingAgent?.role !== 'owner') && (
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                      {language === 'en' ? 'Role' : 'রোল'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'agent', label: language === 'en' ? 'Agent (Limited)' : 'এজেন্ট (সীমিত)', icon: Shield, color: 'blue' },
                        { value: 'admin', label: language === 'en' ? 'Admin (Full Access)' : 'অ্যাডমিন (সম্পূর্ণ)', icon: ShieldCheck, color: 'violet' },
                      ].map(({ value, label, icon: Icon, color }) => (
                        <div
                          key={value}
                          onClick={() => setFormData({ ...formData, role: value })}
                          className={`cursor-pointer p-2.5 border rounded-xl flex items-center gap-2 transition-all ${
                            formData.role === value
                              ? `border-${color}-400 bg-${color}-50 text-${color}-700`
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[12px] font-semibold">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin: full access notice */}
                {formData.role === 'admin' && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="text-[12px] text-emerald-700 font-semibold">
                      {language === 'en'
                        ? 'Admin has full access to all features and menus automatically.'
                        : 'অ্যাডমিন স্বয়ংক্রিয়ভাবে সমস্ত ফিচার ও মেনুতে সম্পূর্ণ অ্যাক্সেস পাবে।'}
                    </p>
                  </div>
                )}

                {/* Agent: Menu Permissions */}
                {formData.role === 'agent' && (
                  <>
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-[12px] font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        {language === 'en' ? 'Menu Permissions' : 'মেনু পারমিশন'}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {MENU_PERMISSIONS.map(({ key, label, labelBn, icon: Icon }) => {
                          const checked = formData.menuPermissions.includes(key);
                          return (
                            <label
                              key={key}
                              className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                                checked
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleMenuPermission(key)}
                                className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary"
                              />
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-[11px] font-semibold">
                                {language === 'en' ? label : labelBn}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Channel Access */}
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-[12px] font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5 text-slate-400" />
                        {language === 'en' ? 'Inbox Channel Access' : 'ইনবক্স চ্যানেল অ্যাক্সেস'}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 mb-2">
                        {[
                          { value: 'ALL_CHANNELS', label: 'All Channels', labelBn: 'সব চ্যানেল', sub: 'Access all messages', subBn: 'সব মেসেজ দেখতে পাবে' },
                          { value: 'ASSIGNED_CHANNELS', label: 'Assigned Only', labelBn: 'নির্দিষ্ট চ্যানেল', sub: 'Specific channels only', subBn: 'নির্দিষ্ট চ্যানেল' },
                        ].map(({ value, label, labelBn, sub, subBn }) => (
                          <div
                            key={value}
                            onClick={() => setFormData({ ...formData, agentAccessMode: value })}
                            className={`cursor-pointer p-2 border rounded-xl flex items-start gap-2 transition-all ${
                              formData.agentAccessMode === value
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                              formData.agentAccessMode === value ? 'border-primary' : 'border-slate-300'
                            }`}>
                              {formData.agentAccessMode === value && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <div>
                              <div className="font-semibold text-[12px]">{language === 'en' ? label : labelBn}</div>
                              <div className="text-[10px] opacity-70">{language === 'en' ? sub : subBn}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {formData.agentAccessMode === 'ASSIGNED_CHANNELS' && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {channels.length === 0 ? (
                            <p className="text-[12px] text-amber-600 bg-amber-50 p-2 rounded-lg">
                              {language === 'en' ? 'No channels connected yet.' : 'এখনো কোনো চ্যানেল কানেক্ট করা হয়নি।'}
                            </p>
                          ) : channels.map(channel => (
                            <label key={channel.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                              <input
                                type="checkbox"
                                checked={formData.assignedChannels.includes(channel.id)}
                                onChange={() => handleToggleChannel(channel.id)}
                                className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary"
                              />
                              <div>
                                <div className="text-[12px] font-semibold text-slate-800">
                                  {channel.displayName || channel.externalAccountId}
                                </div>
                                <div className="text-[10px] text-slate-500 uppercase">{channel.channelType}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="submit"
                form="agentForm"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-[13px] font-semibold transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save className="w-3.5 h-3.5" />}
                {language === 'en' ? 'Save Member' : 'সেইভ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
