'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { Loader2, Plus, Edit, Trash2, Save, X } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function BusinessNaturePage() {
  const [natures, setNatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', nameBn: '', isActive: true });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNatures();
  }, []);

  const fetchNatures = async () => {
    try {
      const res = await fetch(`${API}/business-natures`);
      if (res.ok) setNatures(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const token = Cookies.get('access_token');
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId ? `${API}/business-natures/${editingId}` : `${API}/business-natures`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await fetchNatures();
        setIsAdding(false);
        setEditingId(null);
        setFormData({ name: '', nameBn: '', isActive: true });
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to save');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    const token = Cookies.get('access_token');
    try {
      const res = await fetch(`${API}/business-natures/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchNatures();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (nature: any) => {
    setEditingId(nature.id);
    setIsAdding(true);
    setFormData({
      name: nature.name,
      nameBn: nature.nameBn || '',
      isActive: nature.isActive
    });
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Business Nature</h1>
          <p className="text-slate-500 text-sm mt-1">Manage the master list of business categories for tenant onboarding.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setFormData({ name: '', nameBn: '', isActive: true });
            }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {isAdding && (
        <div className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">Name (English)</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. E-commerce"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-zinc-300">Name (Bengali)</label>
              <input
                type="text"
                value={formData.nameBn}
                onChange={e => setFormData({ ...formData, nameBn: e.target.value })}
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. ই-কমার্স"
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-slate-300 text-primary focus:ring-primary"
                id="isActive"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-zinc-300">Active (Visible in dropdown)</label>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button 
              onClick={() => setIsAdding(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={saving || !formData.name}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name (EN)</th>
              <th className="px-4 py-3 font-medium">Name (BN)</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
            {natures.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No records found.</td>
              </tr>
            ) : (
              natures.map((nature) => (
                <tr key={nature.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{nature.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">{nature.nameBn || '-'}</td>
                  <td className="px-4 py-3">
                    {nature.isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-500/20">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-xs font-medium border border-slate-200 dark:border-zinc-700">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => startEdit(nature)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(nature.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
