'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { io, Socket } from 'socket.io-client';
import { Bell, Check, X, ShieldAlert, Sparkles, Inbox as InboxIcon, Info } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchNotifications = async () => {
    try {
      const token = Cookies.get('access_token');
      if (!token) return;

      const headers = { 'Authorization': `Bearer ${token}` };
      const [listRes, countRes] = await Promise.all([
        fetch(`${API}/notifications`, { headers }),
        fetch(`${API}/notifications/unread-count`, { headers })
      ]);

      if (listRes.ok) setNotifications(await listRes.json());
      if (countRes.ok) {
        const { count } = await countRes.json();
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const token = Cookies.get('access_token');
    if (!token) return;

    // Connect to Notification Namespace
    const socket = io(`${API}/notifications`, {
      auth: { token },
      transports: ['polling', 'websocket']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to real-time notification gateway');
    });

    socket.on('notification_received', (newNotif: Notification) => {
      setNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
      setUnreadCount(prev => prev + 1);

      // Play audio notification
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      } catch (err) {}
    });

    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      socket.disconnect();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/notifications/read-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'signup':
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case 'billing':
        return <ShieldAlert className="w-4 h-4 text-amber-500" />;
      case 'inbox':
        return <InboxIcon className="w-4 h-4 text-primary" />;
      default:
        return <Info className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-surface-hover rounded-xl transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-surface-hover rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-surface-hover flex items-center justify-between">
            <span className="font-bold text-sm">{language === 'en' ? 'Notifications' : 'নোটিফিকেশন'}</span>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary hover:underline font-medium"
              >
                {language === 'en' ? 'Mark all read' : 'সব পঠিত চিহ্নিত করুন'}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 border-b border-surface-hover flex gap-3 items-start transition-colors relative group hover:bg-surface-hover/30 ${!notif.isRead ? 'bg-primary/5' : ''}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 space-y-1 pr-6">
                    <h4 className={`text-xs font-bold ${!notif.isRead ? 'text-zinc-100' : 'text-zinc-400'}`}>{notif.title}</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{notif.message}</p>
                    <span className="text-[9px] text-zinc-500 block">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {!notif.isRead && (
                    <button 
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="absolute right-3 top-4 p-1 text-zinc-500 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-zinc-500">
                {language === 'en' ? 'No notifications' : 'কোনো নোটিফিকেশন নেই'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
