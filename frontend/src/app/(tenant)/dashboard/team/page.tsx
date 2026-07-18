'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Cookies from 'js-cookie';
import { Users, Plus, Shield, ShieldCheck, Mail, Save, X, Edit2, Trash2, CheckCircle2, Crown } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TeamPage() {
  const { language } = useLanguage();
  const [agents, setAgents] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
    agentAccessMode: 'ALL_CHANNELS',
    assignedChannels: [] as string[]
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

      if (agentsRes.ok) setAgents(await agentsRes.json());
      if (channelsRes.ok) setChannels(await channelsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (agent: any = null) => {
    setError('');
    if (agent) {
      setEditingAgent(agent);
      setFormData({
        name: agent.name,
        email: agent.email,
        password: '',
        role: agent.role,
        agentAccessMode: agent.agentAccessMode,
        assignedChannels: agent.channelAssignments?.map((c: any) => c.channelConnectionId) || []
      });
    } else {
      setEditingAgent(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'agent',
        agentAccessMode: 'ALL_CHANNELS',
        assignedChannels: []
      });
    }
    setIsModalOpen(true);
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save agent');
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
    if (!confirm(language === 'en' ? 'Are you sure you want to delete this user?' : 'আপনি কি নিশ্চিত যে এই ইউজারকে মুছে ফেলতে চান?')) return;
    
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
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white/70 dark:bg-[#0f0f11]/80 backdrop-blur-xl border border-white/50 dark:border-zinc-800/80 rounded-2xl p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] max-w-6xl mx-auto space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            {language === 'en' ? 'Team Management' : 'টিম ম্যানেজমেন্ট'}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-[13px] mt-1">
            {language === 'en' 
              ? 'Manage agents, assign roles, and configure channel access.' 
              : 'এজেন্ট ম্যানেজ করুন, রোল এবং চ্যানেল অ্যাক্সেস কনফিগার করুন।'}
          </p>
        </div>
        
        <button
          onClick={() => openModal()}
          className="flex items-center gap-1.5 px-2 py-1 bg-primary hover:bg-primary/90 text-white rounded-lg text-[13px] font-medium transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-3.5 h-3.5" />
          {language === 'en' ? 'Add User' : 'ইউজার যোগ করুন'}
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800 text-[13px] text-slate-500 dark:text-zinc-400">
                  <th className="px-1.5 py-1.5 font-medium">{language === 'en' ? 'User' : 'ইউজার'}</th>
                  <th className="px-1.5 py-1.5 font-medium">{language === 'en' ? 'Role' : 'রোল'}</th>
                  <th className="px-1.5 py-1.5 font-medium">{language === 'en' ? 'Access' : 'অ্যাক্সেস'}</th>
                  <th className="px-1.5 py-1.5 font-medium text-right">{language === 'en' ? 'Actions' : 'অ্যাকশন'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-1.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[12px] uppercase">
                          {agent.name.substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium text-[13px] text-slate-800 dark:text-zinc-200">{agent.name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {agent.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                        agent.role === 'owner' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        agent.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {agent.role === 'owner' ? <Crown className="w-3.5 h-3.5" /> : agent.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                        <span className="capitalize">{agent.role}</span>
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5">
                      {agent.role === 'owner' || agent.role === 'admin' ? (
                        <span className="text-[13px] text-slate-500 dark:text-zinc-400">
                          {language === 'en' ? 'Full Access' : 'সম্পূর্ণ অ্যাক্সেস'}
                        </span>
                      ) : (
                        <div>
                          <span className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">
                            {agent.agentAccessMode === 'ALL_CHANNELS' 
                              ? (language === 'en' ? 'All Channels' : 'সব চ্যানেল')
                              : (language === 'en' ? 'Assigned Channels' : 'নির্ধারিত চ্যানেল')}
                          </span>
                          {agent.agentAccessMode === 'ASSIGNED_CHANNELS' && agent.channelAssignments && (
                            <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-1">
                              {agent.channelAssignments.map((a: any) => {
                                const ch = channels.find(c => c.id === a.channelConnectionId);
                                return ch ? (
                                  <span key={a.channelConnectionId} className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                    {ch.displayName || ch.externalAccountId}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-1.5 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openModal(agent)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {agent.role !== 'owner' && (
                          <button
                            onClick={() => handleDelete(agent.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {agents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-1.5 py-12 text-center text-slate-500">
                      {language === 'en' ? 'No users found.' : 'কোনো ইউজার পাওয়া যায়নি।'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-1.5 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-1.5 py-2.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100">
                {editingAgent 
                  ? (language === 'en' ? 'Edit User' : 'ইউজার এডিট করুন') 
                  : (language === 'en' ? 'Add New User' : 'নতুন ইউজার যোগ করুন')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-1.5 overflow-y-auto">
              {error && (
                <div className="mb-4 p-1.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[13px] rounded-xl">
                  {error}
                </div>
              )}
              
              <form id="agentForm" onSubmit={handleSubmit} className="space-y-2">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    {language === 'en' ? 'Name' : 'নাম'} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-1.5 py-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white"
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    {language === 'en' ? 'Email' : 'ইমেইল'} {editingAgent ? '' : <span className="text-red-500">*</span>}
                  </label>
                  <input 
                    type="email" 
                    required={!editingAgent}
                    disabled={!!editingAgent}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-1.5 py-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white disabled:opacity-50"
                    placeholder="john@example.com"
                  />
                  {!editingAgent && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      {language === 'en' ? 'Login credentials will be sent to this email.' : 'লগইন ক্রেডেনশিয়াল এই ইমেইলে পাঠানো হবে।'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    {language === 'en' ? 'Password' : 'পাসওয়ার্ড'} {editingAgent ? '(Optional)' : '(Optional)'}
                  </label>
                  <input 
                    type="text" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-1.5 py-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white"
                    placeholder={language === 'en' ? "Leave blank to auto-generate" : "ফাঁকা রাখলে অটোমেটিক তৈরি হবে"}
                  />
                </div>

                {(!editingAgent || editingAgent.role !== 'owner') && (
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                      {language === 'en' ? 'Role' : 'রোল'}
                    </label>
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full px-1.5 py-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white"
                    >
                      <option value="agent">Agent (Limited Access)</option>
                      <option value="admin">Admin (Full Access)</option>
                    </select>
                  </div>
                )}

                {formData.role === 'agent' && (
                  <>
                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                      <label className="block text-[13px] font-medium text-slate-700 dark:text-zinc-300 mb-2">
                        {language === 'en' ? 'Inbox Access Mode' : 'ইনবক্স অ্যাক্সেস মুড'}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div 
                          onClick={() => setFormData({...formData, agentAccessMode: 'ALL_CHANNELS'})}
                          className={`cursor-pointer p-1.5 border rounded-xl flex items-start gap-2 transition-all ${
                            formData.agentAccessMode === 'ALL_CHANNELS' 
                              ? 'border-primary bg-primary/5 text-primary' 
                              : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 mt-0.5 rounded-full border flex items-center justify-center ${
                            formData.agentAccessMode === 'ALL_CHANNELS' ? 'border-primary' : 'border-slate-300'
                          }`}>
                            {formData.agentAccessMode === 'ALL_CHANNELS' && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <div className="font-medium text-[13px]">All Channels</div>
                            <div className="text-[11px] opacity-80">Access all messages</div>
                          </div>
                        </div>

                        <div 
                          onClick={() => setFormData({...formData, agentAccessMode: 'ASSIGNED_CHANNELS'})}
                          className={`cursor-pointer p-1.5 border rounded-xl flex items-start gap-2 transition-all ${
                            formData.agentAccessMode === 'ASSIGNED_CHANNELS' 
                              ? 'border-primary bg-primary/5 text-primary' 
                              : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 mt-0.5 rounded-full border flex items-center justify-center ${
                            formData.agentAccessMode === 'ASSIGNED_CHANNELS' ? 'border-primary' : 'border-slate-300'
                          }`}>
                            {formData.agentAccessMode === 'ASSIGNED_CHANNELS' && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <div className="font-medium text-[13px]">Assigned Only</div>
                            <div className="text-[11px] opacity-80">Specific channels</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {formData.agentAccessMode === 'ASSIGNED_CHANNELS' && (
                      <div className="space-y-2">
                        <label className="block text-[13px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                          {language === 'en' ? 'Select Channels' : 'চ্যানেল নির্বাচন করুন'}
                        </label>
                        {channels.length === 0 ? (
                          <div className="text-[13px] text-amber-600 bg-amber-50 p-2 rounded">No channels connected yet.</div>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {channels.map(channel => (
                              <label key={channel.id} className="flex items-center gap-1.5 p-1.5 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={formData.assignedChannels.includes(channel.id)}
                                  onChange={() => handleToggleChannel(channel.id)}
                                  className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary"
                                />
                                <div className="flex items-center gap-2">
                                  {/* Icon based on channel type could go here */}
                                  <div>
                                    <div className="text-[13px] font-medium text-slate-800 dark:text-zinc-200">
                                      {channel.displayName || channel.externalAccountId}
                                    </div>
                                    <div className="text-[11px] text-slate-500 uppercase">{channel.channelType}</div>
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </form>
            </div>
            
            <div className="px-1.5 py-2.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-[13px] font-medium text-slate-600 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="submit"
                form="agentForm"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-[13px] font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {language === 'en' ? 'Save User' : 'সেইভ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
