'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

const AVAILABLE_PERMISSIONS = [
  { id: 'manage:tenants', label: 'Manage Tenants' },
  { id: 'manage:billing', label: 'Manage Billing' },
  { id: 'manage:site', label: 'Manage Site Content' },
  { id: 'manage:audit', label: 'View Audit Logs & Stats' },
  { id: 'manage:team', label: 'Manage Team' },
];

export default function TeamPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    permissions: [] as string[],
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/team`, {
        headers: {
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        }
      });
      if (res.status === 403) {
        router.push('/superadmin');
        return;
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUser 
      ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/team/${editingUser.id}`
      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/team`;
    
    const method = editingUser ? 'PATCH' : 'POST';
    
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setModalOpen(false);
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/team/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        }
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        permissions: user.permissions || [],
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        permissions: [],
      });
    }
    setModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    setFormData(prev => {
      if (prev.permissions.includes(permId)) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== permId) };
      } else {
        return { ...prev, permissions: [...prev.permissions, permId] };
      }
    });
  };

  if (loading) return <div className="text-zinc-400">Loading...</div>;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[13px] font-bold text-foreground">Team Members</h1>
          <p className="text-[12px] text-zinc-500 mt-1">Manage superadmin employees and their access permissions.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-primary hover:bg-primary/90 text-white px-2.5 py-2 rounded-xl text-[12px] font-semibold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
        >
          + Add Employee
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-surface-hover overflow-hidden shadow-sm">
        <table className="w-full text-[12px] text-left">
          <thead className="bg-surface-hover/50 text-zinc-500 border-b border-surface-hover">
            <tr>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Email</th>
              <th className="px-3 py-2 font-semibold">Permissions</th>
              <th className="px-3 py-2 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-hover text-foreground">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-surface-hover/30 transition-colors">
                <td className="px-3 py-2 font-medium">{user.name}</td>
                <td className="px-3 py-2 text-zinc-500">{user.email}</td>
                <td className="px-3 py-2">
                  {user.permissions.includes('*') ? (
                    <span className="px-3 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                      Master Admin
                    </span>
                  ) : (
                    <div className="flex gap-1.5 flex-wrap">
                      {user.permissions.length === 0 && <span className="text-xs text-zinc-400 italic">No access</span>}
                      {user.permissions.map((p: string) => (
                        <span key={p} className="px-2 py-1 text-xs rounded-md bg-secondary/10 text-secondary border border-secondary/20 font-medium">
                          {p.replace('manage:', '')}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => openModal(user)} className="text-blue-500 hover:text-blue-600 font-semibold transition-colors">Edit</button>
                    {user.email !== 'admin@platform.com' && (
                      <button onClick={() => handleDelete(user.id)} className="text-red-500 hover:text-red-600 font-semibold transition-colors">Remove</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-2 text-center text-zinc-500">No team members found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2.5">
          <div className="bg-surface border border-surface-hover w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-3 py-2 border-b border-surface-hover flex justify-between items-center bg-surface-hover/30 shrink-0">
              <h2 className="text-[13px] font-bold text-foreground">{editingUser ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => setModalOpen(false)} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-surface-hover text-zinc-500 transition-colors">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-3 space-y-5 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-[12px] font-semibold text-foreground mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="e.g. John Doe"
                  className="w-full bg-background border border-surface-hover rounded-xl px-2.5 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-[12px] transition-all"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-foreground mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  disabled={editingUser && formData.email === 'admin@platform.com'}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required
                  placeholder="john@example.com"
                  className="w-full bg-background border border-surface-hover rounded-xl px-2.5 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-[12px] disabled:opacity-50 transition-all"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-foreground mb-1.5">
                  Password {editingUser && <span className="text-zinc-400 font-normal text-xs">(leave blank to keep current)</span>}
                </label>
                <input 
                  type="password" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required={!editingUser}
                  placeholder="••••••••"
                  className="w-full bg-background border border-surface-hover rounded-xl px-2.5 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-[12px] transition-all"
                />
              </div>
              
              <div className="pt-2">
                <label className="block text-[12px] font-semibold text-foreground mb-3">Access Permissions</label>
                {formData.email === 'admin@platform.com' ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                    <p className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Primary superadmin has full access.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 p-2.5 bg-background border border-surface-hover rounded-xl">
                    {AVAILABLE_PERMISSIONS.map(perm => (
                      <label key={perm.id} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-surface-hover rounded-lg transition-colors">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.permissions.includes(perm.id) ? 'bg-primary border-primary' : 'border-zinc-400 bg-transparent group-hover:border-primary'}`}>
                          {formData.permissions.includes(perm.id) && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-[12px] text-foreground font-medium">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-2.5 py-2.5 rounded-xl font-bold border border-surface-hover hover:bg-surface-hover text-foreground transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-2.5 py-2.5 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
