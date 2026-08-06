'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export default function SuperadminProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/me`, {
        headers: { 'Authorization': `Bearer ${Cookies.get('access_token')}` }
      });
      if (res.ok) {
        setProfile(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/change-password`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.message || 'Failed to update password');
      }
    } catch (err) {
      setError('An error occurred while updating password');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="text-zinc-400">Loading profile...</div>;
  if (!profile) return <div className="text-red-400">Failed to load profile</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-[15px] font-bold text-foreground">Admin Profile</h1>
        <p className="text-zinc-500 mt-2">Manage your account settings and change password.</p>
      </div>

      <div className="bg-surface border border-surface-hover p-2.5 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 mb-2 pb-4 border-b border-surface-hover">
          <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-[15px] font-bold uppercase">
            {profile.name?.charAt(0) || 'A'}
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-foreground">{profile.name}</h2>
            <p className="text-zinc-500">{profile.email}</p>
            <div className="mt-2">
              <span className="px-3 py-1 text-xs rounded-full bg-secondary/10 text-secondary border border-secondary/20 font-bold uppercase tracking-wider">
                {profile.role}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <h3 className="text-[15px] font-bold text-foreground mb-2">Change Password</h3>
          
          <div>
            <label className="block text-[12px] font-semibold mb-2 text-foreground">Current Password</label>
            <input 
              type="password" 
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="Enter current password"
              className="w-full bg-background border border-surface-hover rounded-xl px-2.5 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all" 
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold mb-2 text-foreground">New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Enter new password"
                className="w-full bg-background border border-surface-hover rounded-xl px-2.5 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all" 
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold mb-2 text-foreground">Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
                className="w-full bg-background border border-surface-hover rounded-xl px-2.5 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all" 
              />
            </div>
          </div>

          {error && <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[12px] font-medium">{error}</div>}
          {success && <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[12px] font-medium">{success}</div>}

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={updating}
              className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {updating ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
