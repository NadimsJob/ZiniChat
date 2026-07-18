'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { Search, List, Kanban, Plus, UserCircle, Tag, Calendar, MessageSquare, X, MessageCircle, ShoppingBag, Phone, Mail, Building, MapPin, UserPlus, Edit2, Trash2, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function LeadsPage() {
  const { language } = useLanguage();
  const router = useRouter();
  
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [leads, setLeads] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Slide-over state
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [noteContent, setNoteContent] = useState('');
  
  // Form states for Lead Details editing
  const [editDetails, setEditDetails] = useState<any>({});

  // Modals state
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#3b82f6');
  
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editStageColor, setEditStageColor] = useState('#3b82f6');
  
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    address: '',
    assignedUserId: ''
  });

  const fetchStages = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/leads/stages`, {
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` }
      });
      if (res.ok) setStages(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/leads`, {
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` }
      });
      if (res.ok) setLeads(await res.json());
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/leads/team`, {
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` }
      });
      if (res.ok) setTeamMembers(await res.json());
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchStages();
    fetchLeads();
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (selectedLead) {
      setEditDetails({
        stageId: selectedLead.stageId || '',
        followUpAt: selectedLead.followUpAt ? new Date(selectedLead.followUpAt).toISOString().split('T')[0] : '',
        phone: selectedLead.phone || '',
        email: selectedLead.email || '',
        company: selectedLead.company || '',
        address: selectedLead.address || '',
        assignedUserId: selectedLead.assignedUserId || ''
      });
    }
  }, [selectedLead]);

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/leads/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Cookies.get('access_token')}` },
        body: JSON.stringify({ name: newStageName, color: newStageColor })
      });
      if (res.ok) {
        setIsAddingStage(false);
        setNewStageName('');
        fetchStages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStage = async (id: string) => {
    if (!editStageName.trim()) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/leads/stages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Cookies.get('access_token')}` },
        body: JSON.stringify({ name: editStageName, color: editStageColor })
      });
      if (res.ok) {
        setEditingStageId(null);
        fetchStages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stage? Leads in this stage will be unassigned from it.')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/leads/stages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` }
      });
      if (res.ok) {
        fetchStages();
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name.trim()) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Cookies.get('access_token')}` },
        body: JSON.stringify({ 
          ...newLeadForm,
          stageId: stages[0]?.id 
        })
      });
      if (res.ok) {
        setIsCreatingLead(false);
        setNewLeadForm({ name: '', phone: '', email: '', company: '', address: '', assignedUserId: '' });
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLeadDetails = async () => {
    if (!selectedLead) return;
    
    const payload: any = { ...editDetails };
    if (!payload.stageId) payload.stageId = null;
    if (!payload.assignedUserId) payload.assignedUserId = null;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/leads/${selectedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Cookies.get('access_token')}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchLeads();
        const updated = await res.json();
        setSelectedLead({ ...selectedLead, ...updated });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLeadStage = async (leadId: string, stageId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Cookies.get('access_token')}` },
        body: JSON.stringify({ stageId })
      });
      if (res.ok) {
        fetchLeads();
        if (selectedLead && selectedLead.id === leadId) setSelectedLead({ ...selectedLead, stageId });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim() || !selectedLead) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/leads/${selectedLead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Cookies.get('access_token')}` },
        body: JSON.stringify({ content: noteContent })
      });
      if (res.ok) {
        setNoteContent('');
        fetchLeads();
        const updatedNote = await res.json();
        setSelectedLead({ ...selectedLead, notes: [updatedNote, ...(selectedLead.notes || [])] });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, leadId: string) => e.dataTransfer.setData('leadId', leadId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) handleUpdateLeadStage(leadId, stageId);
  };

  const filteredLeads = leads.filter(l => 
    l.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.externalContactId.includes(searchQuery) ||
    l.phone?.includes(searchQuery) ||
    l.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-white/70 dark:bg-[#0f0f11]/80 backdrop-blur-xl border border-white/50 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] relative text-[13px]">
      <div className={`flex-1 flex flex-col transition-all duration-300 min-w-0`}>
        
        {/* Compact Header */}
        <div className="px-1.5 py-1 border-b border-border bg-surface/50 backdrop-blur-xl flex justify-between items-center z-10">
          <div className="flex items-center space-x-4">
            <h1 className="text-[13px] font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              {language === 'en' ? 'Leads' : 'লিডস'}
            </h1>
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder={language === 'en' ? "Search leads..." : "লিড খুঁজুন..."}
                className="w-full pl-8 pr-3 py-1.5 bg-background/50 border border-border rounded-lg text-[12px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCreatingLead(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-[12px] font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              {language === 'en' ? 'Add Lead' : 'নতুন লিড'}
            </button>
            <div className="flex bg-surface/80 p-0.5 rounded-lg border border-border">
              <button onClick={() => setView('kanban')} className={`p-1.5 rounded-md transition-all ${view === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-surface'}`}>
                <Kanban className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-surface'}`}>
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar bg-transparent p-1.5">
          {loading ? (
            <div className="flex justify-center items-center h-full"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
          ) : view === 'kanban' ? (
            <div className="flex space-x-4 h-full overflow-x-auto pb-2 items-start">
              {stages.map(stage => (
                <div
                  key={stage.id}
                  className="flex-shrink-0 w-64 rounded-xl flex flex-col max-h-full overflow-hidden shadow-md"
                  style={{ border: `1.5px solid ${stage.color}40`, background: `linear-gradient(160deg, ${stage.color}12 0%, transparent 60%)` }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  {/* Colored Header */}
                  <div
                    className="px-1.5 py-2.5 flex justify-between items-center rounded-t-xl group/stage"
                    style={{ background: `linear-gradient(90deg, ${stage.color}30, ${stage.color}15)`, borderBottom: `1px solid ${stage.color}40` }}
                  >
                    {editingStageId === stage.id ? (
                      <div className="flex items-center space-x-1.5 w-full">
                        <input type="color" value={editStageColor} onChange={(e) => setEditStageColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer p-0 border-0 bg-transparent flex-shrink-0" />
                        <input type="text" value={editStageName} onChange={(e) => setEditStageName(e.target.value)} className="w-full bg-background border border-border px-1 py-0.5 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-primary" autoFocus />
                        <button onClick={() => handleUpdateStage(stage.id)} className="text-green-500 hover:text-green-600 p-0.5"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingStageId(null)} className="text-foreground/50 hover:text-foreground p-0.5"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2">
                          <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: stage.color, boxShadow: `0 0 6px ${stage.color}` }}></div>
                          <h3 className="font-bold text-[11px]" style={{ color: stage.color }}>{stage.name}</h3>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="hidden group-hover/stage:flex items-center space-x-1 mr-1">
                            <button onClick={() => { setEditingStageId(stage.id); setEditStageName(stage.name); setEditStageColor(stage.color); }} className="text-foreground/40 hover:text-primary"><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => handleDeleteStage(stage.id)} className="text-foreground/40 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                          </div>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${stage.color}25`, color: stage.color, border: `1px solid ${stage.color}50` }}
                          >
                            {filteredLeads.filter(l => l.stageId === stage.id).length}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="p-1.5 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar h-full min-h-[150px]">
                    {filteredLeads.filter(l => l.stageId === stage.id).map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => setSelectedLead(lead)}
                        className="bg-background/80 backdrop-blur-sm p-2 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
                        style={{ border: `1px solid ${stage.color}30`, borderLeft: `3px solid ${stage.color}` }}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-[11px] text-foreground truncate">{lead.name || lead.externalContactId}</h4>
                          <MessageCircle className={`w-3 h-3 flex-shrink-0 ${lead.channel === 'whatsapp' ? 'text-green-500' : lead.channel === 'manual' ? 'text-gray-400' : 'text-blue-500'}`} />
                        </div>
                        {lead.company && <div className="text-[10px] text-foreground/50 truncate mt-0.5">{lead.company}</div>}
                        
                        <div className="flex items-center justify-between mt-2">
                          {lead.assignedUser ? (
                            <div className="flex items-center space-x-1" title={`Assigned to ${lead.assignedUser.name}`}>
                              {lead.assignedUser.profilePicUrl ? (
                                <img src={lead.assignedUser.profilePicUrl} className="w-3.5 h-3.5 rounded-full" />
                              ) : (
                                <div
                                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                                  style={{ backgroundColor: stage.color }}
                                >
                                  {lead.assignedUser.name.charAt(0)}
                                </div>
                              )}
                            </div>
                          ) : <div />}
                          
                          {lead.followUpAt && (
                            <div className="flex items-center text-[10px] text-orange-500 bg-orange-500/10 w-fit px-1.5 py-0.5 rounded font-medium">
                              <Calendar className="w-2.5 h-2.5 mr-1" />
                              {new Date(lead.followUpAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="flex-shrink-0 w-64">
                {isAddingStage ? (
                  <form onSubmit={handleCreateStage} className="bg-surface/50 border border-border p-1.5 rounded-xl">
                    <input type="text" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="Stage Name" className="w-full bg-background border border-border px-2 py-1.5 rounded-md mb-2 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none" autoFocus />
                    <div className="flex space-x-2">
                      <input type="color" value={newStageColor} onChange={(e) => setNewStageColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer p-0 border-0 bg-transparent" />
                      <button type="submit" className="flex-1 bg-primary text-primary-foreground text-[11px] py-1 rounded-md">Save</button>
                      <button type="button" onClick={() => setIsAddingStage(false)} className="flex-1 bg-surface border border-border text-[11px] py-1 rounded-md">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setIsAddingStage(true)} className="w-full h-10 border border-dashed border-border rounded-xl flex items-center justify-center text-foreground/50 hover:text-primary hover:border-primary hover:bg-primary/5 text-[11px] font-medium">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Stage
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-primary/10 shadow-xl shadow-primary/5 hover:border-primary/20 hover:shadow-primary/10 transition-all rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-border text-[11px]">
                <thead className="bg-surface/50">
                  <tr>
                    <th className="px-1.5 py-2.5 text-left font-semibold text-foreground/60 uppercase tracking-wider">Contact</th>
                    <th className="px-1.5 py-2.5 text-left font-semibold text-foreground/60 uppercase tracking-wider">Company</th>
                    <th className="px-1.5 py-2.5 text-left font-semibold text-foreground/60 uppercase tracking-wider">Stage</th>
                    <th className="px-1.5 py-2.5 text-left font-semibold text-foreground/60 uppercase tracking-wider">Assigned To</th>
                    <th className="px-1.5 py-2.5 text-left font-semibold text-foreground/60 uppercase tracking-wider">Follow Up</th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-surface/50 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                      <td className="px-1.5 py-2 whitespace-nowrap">
                        <div className="font-medium text-foreground">{lead.name || lead.externalContactId}</div>
                        {lead.phone && <div className="text-[10px] text-foreground/50">{lead.phone}</div>}
                      </td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-foreground/70">{lead.company || '-'}</td>
                      <td className="px-1.5 py-2 whitespace-nowrap">
                        {lead.stage ? (
                          <span className="px-2 py-0.5 rounded border" style={{ borderColor: lead.stage.color, color: lead.stage.color, backgroundColor: `${lead.stage.color}10` }}>{lead.stage.name}</span>
                        ) : '-'}
                      </td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-foreground/70">{lead.assignedUser?.name || 'Unassigned'}</td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-foreground/70">
                        {lead.followUpAt ? new Date(lead.followUpAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over — fixed to viewport right edge */}
      <div className={`fixed top-16 bottom-0 right-0 w-96 bg-surface border-l border-border shadow-2xl transform transition-transform duration-200 z-40 flex flex-col ${selectedLead ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedLead && (
          <>
            <div className="px-1.5 py-1 border-b border-border flex justify-between items-center bg-background/50 backdrop-blur-md">
              <h2 className="text-[13px] font-bold text-foreground">Lead Details</h2>
              <div className="flex items-center space-x-2">
                <button onClick={handleUpdateLeadDetails} className="text-[11px] bg-primary text-primary-foreground px-1.5 py-1 rounded-md font-semibold hover:bg-primary/90">Save Changes</button>
                <button onClick={() => setSelectedLead(null)} className="text-foreground/50 hover:text-foreground p-1"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-1.5 space-y-5 custom-scrollbar">
              
              <div className="flex items-center space-x-3 pb-4 border-b border-border">
                <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                  <UserCircle className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[13px] font-bold text-foreground leading-tight">{selectedLead.name || 'Unknown'}</h3>
                  <p className="text-[11px] text-foreground/60">{selectedLead.externalContactId}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => router.push(`/dashboard/inbox?contactId=${selectedLead.id}`)} className="flex items-center justify-center space-x-1.5 bg-primary text-primary-foreground py-2 rounded-lg text-[11px] font-semibold hover:bg-primary/90">
                  <MessageSquare className="w-3.5 h-3.5" /> <span>Chat</span>
                </button>
                <button onClick={() => router.push('/dashboard/orders')} className="flex items-center justify-center space-x-1.5 bg-surface border border-border py-2 rounded-lg text-[11px] font-semibold hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all">
                  <ShoppingBag className="w-3.5 h-3.5" /> <span>Order</span>
                </button>
              </div>

              <div className="bg-background rounded-lg p-1.5 border border-border space-y-3">
                <h4 className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Status & Assignment</h4>
                
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground/70 mb-1">Stage</label>
                    <select value={editDetails.stageId} onChange={(e) => setEditDetails({...editDetails, stageId: e.target.value})} className="w-full bg-surface border border-border rounded-md py-1.5 px-2 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none">
                      <option value="">Select Stage...</option>
                      {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground/70 mb-1">Follow-up Date</label>
                    <input type="date" value={editDetails.followUpAt} onChange={(e) => setEditDetails({...editDetails, followUpAt: e.target.value})} className="w-full bg-surface border border-border rounded-md py-1.5 px-2 text-[11px] focus:ring-1 focus:outline-none text-foreground" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-foreground/70 mb-1 flex items-center"><UserPlus className="w-3 h-3 mr-1" /> Assigned To</label>
                  <select value={editDetails.assignedUserId} onChange={(e) => setEditDetails({...editDetails, assignedUserId: e.target.value})} className="w-full bg-surface border border-border rounded-md py-1.5 px-2 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none">
                    <option value="">Unassigned</option>
                    {teamMembers.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-background rounded-lg p-1.5 border border-border space-y-3">
                <h4 className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Contact Info</h4>
                
                <div>
                  <label className="block text-[11px] font-medium text-foreground/70 mb-1 flex items-center"><Phone className="w-3 h-3 mr-1" /> Phone Number</label>
                  <input type="text" value={editDetails.phone} onChange={(e) => setEditDetails({...editDetails, phone: e.target.value})} placeholder="+123456789" className="w-full bg-surface border border-border rounded-md py-1.5 px-2 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none text-foreground" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-foreground/70 mb-1 flex items-center"><Mail className="w-3 h-3 mr-1" /> Email Address</label>
                  <input type="email" value={editDetails.email} onChange={(e) => setEditDetails({...editDetails, email: e.target.value})} placeholder="email@example.com" className="w-full bg-surface border border-border rounded-md py-1.5 px-2 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none text-foreground" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-foreground/70 mb-1 flex items-center"><Building className="w-3 h-3 mr-1" /> Company Name</label>
                  <input type="text" value={editDetails.company} onChange={(e) => setEditDetails({...editDetails, company: e.target.value})} placeholder="Company Ltd." className="w-full bg-surface border border-border rounded-md py-1.5 px-2 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none text-foreground" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-foreground/70 mb-1 flex items-center"><MapPin className="w-3 h-3 mr-1" /> Address</label>
                  <input type="text" value={editDetails.address} onChange={(e) => setEditDetails({...editDetails, address: e.target.value})} placeholder="Full Address..." className="w-full bg-surface border border-border rounded-md py-1.5 px-2 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none text-foreground" />
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-foreground/60 mb-2 uppercase tracking-wider flex items-center">
                  <Tag className="w-3 h-3 mr-1" /> Notes
                </h4>
                <div className="relative mb-3">
                  <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Type a note..." className="w-full bg-background border border-border rounded-lg p-2.5 text-[11px] focus:ring-1 focus:ring-primary focus:outline-none min-h-[70px] resize-none pb-8" />
                  <button onClick={handleSaveNote} className="absolute bottom-2 right-2 bg-primary text-primary-foreground px-1.5 py-1 rounded-md text-[10px] font-semibold hover:bg-primary/90">Add</button>
                </div>
                <div className="space-y-2">
                  {selectedLead.notes?.map((note: any) => (
                    <div key={note.id} className="bg-background border border-border p-2.5 rounded-lg">
                      <p className="text-[11px] text-foreground/90 whitespace-pre-wrap">{note.content}</p>
                      <p className="text-[10px] text-foreground/40 mt-1">{new Date(note.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                  {(!selectedLead.notes || selectedLead.notes.length === 0) && (
                    <p className="text-[11px] text-center text-foreground/40 py-2.5">No notes added yet.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Lead Modal */}
      {isCreatingLead && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-1.5">
          <div className="bg-surface border border-primary/10 shadow-xl shadow-primary/5 hover:border-primary/20 hover:shadow-primary/10 transition-all rounded-2xl w-full max-w-md shadow-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[13px] font-bold text-foreground">Create New Lead</h2>
              <button onClick={() => setIsCreatingLead(false)} className="text-foreground/50 hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-foreground/70 mb-1">Lead Name *</label>
                <input 
                  type="text" required autoFocus
                  value={newLeadForm.name} onChange={(e) => setNewLeadForm({...newLeadForm, name: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="e.g. John Doe"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-foreground/70 mb-1 flex items-center"><Phone className="w-3 h-3 mr-1" /> Phone</label>
                  <input 
                    type="text" 
                    value={newLeadForm.phone} onChange={(e) => setNewLeadForm({...newLeadForm, phone: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:ring-1 focus:ring-primary focus:outline-none"
                    placeholder="+123456789"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-foreground/70 mb-1 flex items-center"><Mail className="w-3 h-3 mr-1" /> Email</label>
                  <input 
                    type="email" 
                    value={newLeadForm.email} onChange={(e) => setNewLeadForm({...newLeadForm, email: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:ring-1 focus:ring-primary focus:outline-none"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-foreground/70 mb-1 flex items-center"><Building className="w-3 h-3 mr-1" /> Company</label>
                <input 
                  type="text" 
                  value={newLeadForm.company} onChange={(e) => setNewLeadForm({...newLeadForm, company: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="Company Name"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-foreground/70 mb-1 flex items-center"><UserPlus className="w-3 h-3 mr-1" /> Assign To</label>
                <select 
                  value={newLeadForm.assignedUserId} onChange={(e) => setNewLeadForm({...newLeadForm, assignedUserId: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg px-1.5 py-2 text-[13px] focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-border">
                <button type="button" onClick={() => setIsCreatingLead(false)} className="px-1.5 py-2 text-[11px] font-medium text-foreground/70 hover:text-foreground">Cancel</button>
                <button type="submit" className="px-1.5 py-2 bg-primary text-primary-foreground text-[11px] font-bold rounded-lg hover:bg-primary/90">Create Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
