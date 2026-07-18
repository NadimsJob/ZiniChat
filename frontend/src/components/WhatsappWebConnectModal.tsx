'use client';

import { useState, useEffect } from 'react';
import { X, Smartphone, RefreshCw, AlertCircle, QrCode as QrIcon } from 'lucide-react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import QRCode from 'react-qr-code';
import { io } from 'socket.io-client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WhatsappWebConnectModal({ isOpen, onClose, onSuccess }: Props) {
  const { language } = useLanguage();
  const [connectMethod, setConnectMethod] = useState<'qr' | 'phone'>('qr');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const token = Cookies.get('access_token');
    const socket = io(`${API}/inbox`, {
      auth: { token }
    });

    socket.on('whatsapp_qr_code', (data) => {
      if (data.qr) {
        setQrCodeData(data.qr);
        setLoading(false);
      }
    });

    socket.on('whatsapp_qr_connected', (data) => {
      if (data.success) {
        onSuccess();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isOpen, onSuccess]);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/whatsapp-web/start-pairing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`,
        },
        body: JSON.stringify({ phoneNumber: phone.replace(/[^0-9]/g, '') }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request pairing code');

      setPairingCode(data.pairingCode);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetQr = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/whatsapp-web/start-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`,
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request QR code');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-500" />
            {language === 'en' ? 'Link Device' : 'ডিভাইস কানেক্ট করুন'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs inside modal */}
        <div className="flex border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
          <button
            onClick={() => setConnectMethod('qr')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${connectMethod === 'qr' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {language === 'en' ? 'Scan QR Code' : 'QR কোড স্ক্যান'}
          </button>
          <button
            onClick={() => setConnectMethod('phone')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${connectMethod === 'phone' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {language === 'en' ? 'Use Phone Number' : 'ফোন নম্বর ব্যবহার'}
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-2 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {connectMethod === 'qr' ? (
            <div className="text-center space-y-6 py-4">
              <div className="text-sm text-slate-600 dark:text-zinc-400 text-left space-y-2 mb-4">
                <p>1. {language === 'en' ? 'Open WhatsApp on your phone.' : 'আপনার ফোনে হোয়াটসঅ্যাপ ওপেন করুন।'}</p>
                <p>2. {language === 'en' ? 'Tap Menu or Settings and select' : 'মেন্যু বা সেটিংসে ট্যাপ করুন এবং নির্বাচন করুন'} <strong>{language === 'en' ? 'Linked Devices' : 'Linked Devices'}</strong>.</p>
                <p>3. {language === 'en' ? 'Tap' : 'ট্যাপ করুন'} <strong>{language === 'en' ? 'Link a Device' : 'Link a Device'}</strong>.</p>
                <p>4. {language === 'en' ? 'Point your phone to this screen to capture the code.' : 'কোড স্ক্যান করতে আপনার ফোনের ক্যামেরা এই স্ক্রিনের দিকে ধরুন।'}</p>
              </div>
              
              {!qrCodeData ? (
                <button
                  onClick={handleGetQr}
                  disabled={loading}
                  className="mx-auto py-2.5 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <QrIcon className="w-5 h-5" />}
                  {language === 'en' ? 'Generate QR Code' : 'QR কোড জেনারেট করুন'}
                </button>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <QRCode value={qrCodeData} size={192} />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-blue-500 mt-4 animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Waiting for scan...
                  </div>
                </div>
              )}
            </div>
          ) : !pairingCode ? (
            <form onSubmit={handleConnect} className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-zinc-400">
                {language === 'en' 
                  ? 'Enter your WhatsApp number with country code (e.g., 8801700000000) to receive an 8-digit pairing code.' 
                  : 'কান্ট্রি কোড সহ আপনার হোয়াটসঅ্যাপ নম্বর দিন (যেমন: 88017...)।'}
              </p>
              <input
                type="text"
                required
                placeholder="88017..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={loading || !phone}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <QrIcon className="w-5 h-5" />}
                {language === 'en' ? 'Get Pairing Code' : 'পিয়ারিং কোড পান'}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4 py-4">
              <h3 className="text-xl font-bold tracking-[0.2em] text-slate-900 dark:text-white bg-slate-100 dark:bg-zinc-800 p-4 rounded-xl border border-slate-200 dark:border-zinc-700">
                {pairingCode}
              </h3>
              <div className="text-sm text-slate-600 dark:text-zinc-400 text-left space-y-2">
                <p>1. {language === 'en' ? 'Open WhatsApp on your phone.' : 'আপনার ফোনে হোয়াটসঅ্যাপ ওপেন করুন।'}</p>
                <p>2. {language === 'en' ? 'Tap Menu or Settings and select' : 'মেন্যু বা সেটিংসে ট্যাপ করুন এবং নির্বাচন করুন'} <strong>{language === 'en' ? 'Linked Devices' : 'Linked Devices'}</strong>.</p>
                <p>3. {language === 'en' ? 'Tap' : 'ট্যাপ করুন'} <strong>{language === 'en' ? 'Link a Device' : 'Link a Device'}</strong>.</p>
                <p>4. {language === 'en' ? 'Tap' : 'ট্যাপ করুন'} <strong>{language === 'en' ? 'Link with phone number instead' : 'Link with phone number instead'}</strong> {language === 'en' ? 'at the bottom.' : 'একদম নিচে।'}</p>
                <p>5. {language === 'en' ? 'Enter the code above.' : 'উপরের কোডটি এন্টার করুন।'}</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-blue-500 mt-4 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" /> Waiting for connection...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
