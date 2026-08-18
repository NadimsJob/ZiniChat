'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { ShieldCheck, ShieldAlert, CheckSquare, Square, Search, UserPlus, Key, Trash2, Edit3, Lock, Check } from 'lucide-react';
import AdminLoader from '@/components/AdminLoader';
import AdminPagination from '@/components/AdminPagination';

export interface PermissionItem {
  id: string;
  label: string;
  description: string;
}

export interface PermissionCategory {
  categoryName: string;
  categoryIcon: string;
  permissions: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionCategory[] = [
  {
    categoryName: 'Tenants & Workspaces',
    categoryIcon: '🏢',
    permissions: [
      { id: 'view:tenants', label: 'View Tenants Directory', description: 'Can view list of all tenants and access tenant details report.' },
      { id: 'manage:tenants', label: 'Manage & Customize Tenants', description: 'Can update tenant profiles and customize plan limits.' },
      { id: 'impersonate:tenants', label: 'Enter Tenant Workspace', description: 'Can enter tenant dashboard via impersonation mode.' },
      { id: 'delete:tenants', label: 'Suspend & Delete Tenants', description: 'Can suspend or permanently delete tenant accounts.' },
    ],
  },
  {
    categoryName: 'Billing & Payments',
    categoryIcon: '💳',
    permissions: [
      { id: 'view:billing', label: 'View Financial Ledgers', description: 'Can view MRR overview, subscription ledgers, and payment history.' },
      { id: 'manage:payments', label: 'Approve Manual Payments', description: 'Can review and approve pending MFS/Bank transaction IDs.' },
    ],
  },
  {
    categoryName: 'Support & AI Chats',
    categoryIcon: '💬',
    permissions: [
      { id: 'view:tickets', label: 'View Support Tickets', description: 'Can read tenant support tickets and user messages.' },
      { id: 'reply:tickets', label: 'Reply & Manage Tickets', description: 'Can reply to tickets, change status, and assign team agents.' },
      { id: 'view:support_chats', label: 'View Support AI Chats', description: 'Can inspect ZiniChat widget chat sessions and bot conversations.' },
    ],
  },
  {
    categoryName: 'Content & CMS',
    categoryIcon: '🌐',
    permissions: [
      { id: 'manage:coupons', label: 'Manage Discount Coupons', description: 'Can create, edit, and toggle promotional coupon codes.' },
      { id: 'manage:packages', label: 'Manage Subscription Packages', description: 'Can create and modify platform pricing tiers.' },
      { id: 'manage:templates', label: 'Manage System Templates', description: 'Can create and manage global system prompt templates.' },
      { id: 'manage:site', label: 'Manage Website CMS', description: 'Can edit website landing pages, features, and FAQs.' },
    ],
  },
  {
    categoryName: 'Logs & Settings',
    categoryIcon: '📜',
    permissions: [
      { id: 'view:audit_logs', label: 'View Platform Audit Logs', description: 'Can inspect administrative activity logs across the platform.' },
      { id: 'view:security_logs', label: 'View Security Login Logs', description: 'Can inspect user login logs and security audit entries.' },
      { id: 'manage:settings', label: 'Manage System Settings', description: 'Can configure SMTP, MFS Gateways, Pixel, and GA4.' },
    ],
  },
  {
    categoryName: 'Superadmin Team',
    categoryIcon: '👥',
    permissions: [
      { id: 'view:team', label: 'View Team Members', description: 'Can view list of superadmin employees and staff members.' },
      { id: 'manage:team', label: 'Manage Team & Permissions', description: 'Can add, edit, or delete staff members and customize permissions.' },
    ],
  },
];

export default function SuperadminTeamPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [permSearch, setPermSearch] = useState('');
  
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
        router.push('/sp@dmin');
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
    if (!confirm('Are you sure you want to delete this staff member?')) return;
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
    setPermSearch('');
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
      const exists = prev.permissions.includes(permId);
      let newPerms = exists 
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId];

      // Remove wildcard if toggling individual permission
      if (newPerms.includes('*') && permId !== '*') {
        newPerms = newPerms.filter(p => p !== '*');
      }
      return { ...prev, permissions: newPerms };
    });
  };

  const toggleCategoryAll = (category: PermissionCategory) => {
    const categoryPermIds = category.permissions.map(p => p.id);
    const allChecked = categoryPermIds.every(id => formData.permissions.includes(id));
    
    setFormData(prev => {
      let updated = [...prev.permissions].filter(p => p !== '*');
      if (allChecked) {
        // Deselect category
        updated = updated.filter(id => !categoryPermIds.includes(id));
      } else {
        // Select category all
        const set = new Set([...updated, ...categoryPermIds]);
        updated = Array.from(set);
      }
      return { ...prev, permissions: updated };
    });
  };

  const toggleMasterAdmin = () => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes('*') ? [] : ['*']
    }));
  };

  if (loading) return <div className="text-zinc-400 p-6 text-center text-xs">Loading Superadmin Team...</div>;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-surface/70 backdrop-blur-xl border border-slate-200/80 dark:border-surface-hover p-4 rounded-2xl shadow-sm dark:shadow-lg">
        <div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Superadmin Team Members & Access Controls
          </h1>
          <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-1">
            Assign custom menu access and action permissions to superadmin employees and sub-admins.
          </p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-primary hover:bg-primary/90 text-white px-3 py-2 rounded-xl text-[11px] font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" /> Add Staff Member
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-surface/70 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-surface-hover overflow-hidden shadow-sm dark:shadow-lg">
        {loading ? (
          <AdminLoader message="Loading Superadmin staff members..." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] text-left min-w-[700px]">
                <thead className="bg-slate-100/90 dark:bg-surface-hover/50 text-slate-700 dark:text-zinc-300 border-b border-slate-200 dark:border-surface-hover">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Staff Member</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Assigned Permissions</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-surface-hover text-slate-900 dark:text-zinc-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-zinc-500">No staff members found. Click Add Staff Member above.</td>
                    </tr>
                  ) : (
                    users.slice((page - 1) * pageSize, page * pageSize).map(user => {
                      const isPrimaryAdmin = user.email === 'admin@platform.com';
                      const isMaster = user.permissions.includes('*') || isPrimaryAdmin;

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-surface-hover/30 transition-colors">
                          <td className="px-4 py-3 font-semibold flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-zinc-100">{user.name}</p>
                              {isPrimaryAdmin && <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">Primary Owner</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-zinc-400 font-mono text-[11px]">{user.email}</td>
                          <td className="px-4 py-3">
                            {isMaster ? (
                              <span className="px-3 py-1 text-[10px] rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20 inline-flex items-center gap-1">
                                <Check className="w-3 h-3" /> Master Admin (Full Platform Access)
                              </span>
                            ) : (
                              <div className="flex gap-1.5 flex-wrap">
                                {(!user.permissions || user.permissions.length === 0) && (
                                  <span className="text-[11px] text-slate-500 dark:text-zinc-500 italic">No access permissions assigned</span>
                                )}
                                {(user.permissions || []).map((p: string) => {
                                  let permLabel = p;
                                  PERMISSION_GROUPS.forEach(g => {
                                    const found = g.permissions.find(item => item.id === p);
                                    if (found) permLabel = found.label;
                                  });
                                  return (
                                    <span key={p} className="px-2 py-0.5 text-[10px] rounded-md bg-slate-100 dark:bg-secondary/10 text-slate-700 dark:text-secondary border border-slate-200 dark:border-secondary/20 font-medium">
                                      {permLabel}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => openModal(user)} 
                                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 font-semibold transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit
                              </button>
                              {!isPrimaryAdmin && (
                                <button 
                                  onClick={() => handleDelete(user.id)} 
                                  className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 font-semibold transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remove
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <AdminPagination
              currentPage={page}
              totalItems={users.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* Add / Edit Staff Member Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-[#0f0f11] text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-surface-hover w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-surface-hover flex justify-between items-center bg-slate-50 dark:bg-surface-hover/30 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {editingUser ? 'Edit Staff Member & Permissions' : 'Add Superadmin Staff Member'}
                </h2>
                <p className="text-[10px] text-slate-600 dark:text-zinc-400">Configure credentials and check granular access permissions.</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)} 
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-surface-hover text-slate-500 dark:text-zinc-400 transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              
              {/* Credentials Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="e.g. Tanvir Ahmed"
                    className="w-full bg-slate-50 dark:bg-background border border-slate-300 dark:border-surface-hover text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 rounded-xl px-3 py-2 focus:outline-none focus:border-primary text-xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    disabled={editingUser && formData.email === 'admin@platform.com'}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    required
                    placeholder="agent@platform.com"
                    className="w-full bg-slate-50 dark:bg-background border border-slate-300 dark:border-surface-hover text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 rounded-xl px-3 py-2 focus:outline-none focus:border-primary text-xs disabled:opacity-50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Password {editingUser && <span className="text-slate-500 dark:text-zinc-500 font-normal text-[10px]">(leave blank to keep current)</span>}
                </label>
                <input 
                  type="password" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required={!editingUser}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-background border border-slate-300 dark:border-surface-hover text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 rounded-xl px-3 py-2 focus:outline-none focus:border-primary text-xs transition-all"
                />
              </div>

              {/* Master Admin Toggle & Permission Header */}
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-slate-200 dark:border-surface-hover/60 pb-2">
                  <div>
                    <label className="block text-[12px] font-bold text-slate-900 dark:text-zinc-100">Access Permissions</label>
                    <p className="text-[10px] text-slate-600 dark:text-zinc-400">Check menu features and actions this staff member can access.</p>
                  </div>
                  
                  {formData.email !== 'admin@platform.com' && (
                    <button
                      type="button"
                      onClick={toggleMasterAdmin}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        formData.permissions.includes('*')
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-100 dark:bg-surface-hover/50 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-surface-hover hover:border-emerald-500'
                      }`}
                    >
                      <Lock className="w-3 h-3" />
                      {formData.permissions.includes('*') ? 'Master Admin Assigned (Full Access)' : 'Grant Full Master Access (*)'}
                    </button>
                  )}
                </div>

                {formData.email === 'admin@platform.com' ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Primary Superadmin owner has full unrestricted platform access.
                    </p>
                  </div>
                ) : formData.permissions.includes('*') ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl text-center space-y-1">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">✨ Full Master Access (`*`) Granted</p>
                    <p className="text-[10px] text-slate-600 dark:text-zinc-400">This staff member can access every menu, page, button, and action on the platform.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Filter Search */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-zinc-500" />
                      <input 
                        type="text" 
                        value={permSearch}
                        onChange={e => setPermSearch(e.target.value)}
                        placeholder="Search permissions (e.g. tenants, payments, tickets)..."
                        className="w-full bg-slate-50 dark:bg-background border border-slate-300 dark:border-surface-hover text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 rounded-xl pl-8 pr-3 py-1.5 text-[11px] focus:outline-none focus:border-primary"
                      />
                    </div>

                    {/* Category Groups */}
                    <div className="space-y-3 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                      {PERMISSION_GROUPS.map((group) => {
                        const filteredPerms = group.permissions.filter(p => 
                          !permSearch || 
                          p.label.toLowerCase().includes(permSearch.toLowerCase()) || 
                          p.description.toLowerCase().includes(permSearch.toLowerCase()) ||
                          p.id.toLowerCase().includes(permSearch.toLowerCase())
                        );

                        if (filteredPerms.length === 0) return null;

                        const allChecked = group.permissions.every(p => formData.permissions.includes(p.id));
                        const someChecked = group.permissions.some(p => formData.permissions.includes(p.id));

                        return (
                          <div key={group.categoryName} className="bg-slate-50/80 dark:bg-surface/50 border border-slate-200 dark:border-surface-hover rounded-xl overflow-hidden shadow-sm">
                            {/* Category Header */}
                            <div className="px-3.5 py-2 bg-slate-200/60 dark:bg-surface-hover/40 border-b border-slate-200 dark:border-surface-hover flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                                <span>{group.categoryIcon}</span> {group.categoryName}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleCategoryAll(group)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                                  allChecked 
                                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                    : someChecked
                                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
                                    : 'bg-white dark:bg-background text-slate-600 dark:text-zinc-400 border-slate-300 dark:border-surface-hover hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                {allChecked ? 'Deselect All' : 'Select Category All'}
                              </button>
                            </div>

                            {/* Permission Checkbox Items */}
                            <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {filteredPerms.map((perm) => {
                                const isChecked = formData.permissions.includes(perm.id);

                                return (
                                  <label 
                                    key={perm.id} 
                                    htmlFor={`checkbox-${perm.id}`}
                                    className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer select-none ${
                                      isChecked 
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200' 
                                        : 'bg-white dark:bg-background/60 border-slate-200 dark:border-surface-hover/60 hover:bg-slate-100 dark:hover:bg-surface-hover/40 text-slate-700 dark:text-zinc-400'
                                    }`}
                                  >
                                    <input 
                                      type="checkbox"
                                      id={`checkbox-${perm.id}`}
                                      checked={isChecked}
                                      onChange={() => togglePermission(perm.id)}
                                      className="w-4 h-4 rounded border-slate-300 dark:border-zinc-500 text-emerald-600 dark:text-emerald-500 focus:ring-emerald-500 accent-emerald-600 cursor-pointer shrink-0 mt-0.5"
                                    />
                                    <div>
                                      <p className={`text-[11px] font-bold leading-tight ${isChecked ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-800 dark:text-zinc-200'}`}>
                                        {perm.label}
                                      </p>
                                      <p className="text-[9.5px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight">
                                        {perm.description}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex gap-3 border-t border-slate-200 dark:border-surface-hover shrink-0">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)} 
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-surface-hover hover:bg-slate-100 dark:hover:bg-surface-hover text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all cursor-pointer"
                >
                  {editingUser ? 'Save Permissions & Changes' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
