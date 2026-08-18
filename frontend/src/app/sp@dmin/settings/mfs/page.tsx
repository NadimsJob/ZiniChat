'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { toast, Toaster } from 'react-hot-toast';
import { 
  Plus, 
  Trash2, 
  Edit2,
  Check, 
  X, 
  RefreshCw, 
  Smartphone, 
  Landmark, 
  QrCode, 
  Search, 
  Clipboard,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import AdminLoader from '@/components/AdminLoader';
import AdminPagination from '@/components/AdminPagination';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function MfsSettingsPage() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions'>('accounts');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accPage, setAccPage] = useState(1);
  const [accPageSize, setAccPageSize] = useState(10);
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form fields
  const [provider, setProvider] = useState('BKASH');
  const [accountType, setAccountType] = useState('PERSONAL');
  const [number, setNumber] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [bankName, setBankName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [chargePercent, setChargePercent] = useState('0');
  const [gatewayApiKey, setGatewayApiKey] = useState('sms-gateway-secret-token');
  const [uploading, setUploading] = useState(false);
  const [activeRuleTab, setActiveRuleTab] = useState<'BKASH' | 'NAGAD' | 'ROCKET' | 'UPAY' | 'BANGLA_QR'>('BKASH');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      if (activeTab === 'accounts') {
        const res = await fetch(`${API}/mfs-payments/accounts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAccounts(data);
        }
      } else {
        const res = await fetch(`${API}/mfs-payments/transactions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTransactions(data);
        }
      }
    } catch (error) {
      toast.error(language === 'en' ? 'Failed to fetch data' : 'ডাটা লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
       const token = Cookies.get('access_token');
       const finalNumber = number || merchantId;
       const res = await fetch(`${API}/mfs-payments/accounts`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
         },
         body: JSON.stringify({
           provider,
           accountType,
           number: finalNumber,
           merchantId: merchantId || null,
           bankName: bankName || null,
           routingNumber: routingNumber || null,
           qrCodeUrl: qrCodeUrl || null,
           chargePercent: parseFloat(chargePercent) || 0,
           isActive: true
         })
       });

       if (res.ok) {
         toast.success(language === 'en' ? 'Account added successfully' : 'অ্যাকাউন্ট সফলভাবে যুক্ত হয়েছে');
         setShowAddModal(false);
         setNumber('');
         setMerchantId('');
         setBankName('');
         setRoutingNumber('');
         setQrCodeUrl('');
         setChargePercent('0');
         fetchData();
       } else {
         const err = await res.json();
         toast.error(err.message || 'Error occurred');
       }
     } catch (err) {
       toast.error('API Error');
     }
   };

   const handleCloseModal = () => {
     setShowAddModal(false);
     setEditingAccount(null);
     setNumber('');
     setMerchantId('');
     setBankName('');
     setRoutingNumber('');
     setQrCodeUrl('');
     setChargePercent('0');
   };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const token = Cookies.get('access_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API}/mfs-payments/accounts/temp/upload-qr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setQrCodeUrl(data.qrCodeUrl);
        toast.success(language === 'en' ? 'QR Code uploaded successfully' : 'কিউআর কোড সফলভাবে আপলোড হয়েছে');
      } else {
        toast.error('Failed to upload QR image');
      }
    } catch (err) {
      toast.error('Upload error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleEditClick = (acc: any) => {
    setEditingAccount(acc);
    setProvider(acc.provider);
    setAccountType(acc.accountType);
    setNumber(acc.number);
    setMerchantId(acc.merchantId || '');
    setBankName(acc.bankName || '');
    setRoutingNumber(acc.routingNumber || '');
    setQrCodeUrl(acc.qrCodeUrl || '');
    setChargePercent(acc.chargePercent !== undefined ? acc.chargePercent.toString() : '0');
    setShowAddModal(true);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = Cookies.get('access_token');
      const finalNumber = number || merchantId;
      const res = await fetch(`${API}/mfs-payments/accounts/${editingAccount.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider,
          accountType,
          number: finalNumber,
          merchantId: merchantId || null,
          bankName: bankName || null,
          routingNumber: routingNumber || null,
          qrCodeUrl: qrCodeUrl || null,
          chargePercent: parseFloat(chargePercent) || 0
        })
      });

      if (res.ok) {
        toast.success(language === 'en' ? 'Account updated successfully' : 'অ্যাকাউন্ট সফলভাবে আপডেট হয়েছে');
        setShowAddModal(false);
        setEditingAccount(null);
        setNumber('');
        setMerchantId('');
        setBankName('');
        setRoutingNumber('');
        setQrCodeUrl('');
        setChargePercent('0');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Error occurred');
      }
    } catch (err) {
      toast.error('API Error');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to delete?' : 'আপনি কি নিশ্চিত যে ডিলিট করতে চান?')) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/mfs-payments/accounts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Deleted');
        fetchData();
      }
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleToggleActive = async (account: any) => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/mfs-payments/accounts/${account.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !account.isActive })
      });
      if (res.ok) {
        toast.success('Updated');
        fetchData();
      }
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(language === 'en' ? 'Copied!' : 'কপি করা হয়েছে!');
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.trxId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tx.smsBody && tx.smsBody.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-surface/50 border border-zinc-800 rounded-xl p-3 backdrop-blur-xl">
        <div>
          <h1 className="text-[16px] font-bold text-primary flex items-center gap-1.5">
            <Smartphone className="w-5 h-5 text-primary" />
            {language === 'en' ? 'MFS & Bank Automatic Gateway' : 'এমএফএস ও ব্যাংক অটোমেটিক গেটওয়ে'}
          </h1>
          <p className="text-[11px] text-zinc-400">
            {language === 'en' 
              ? 'Configure bKash, Nagad, Rocket, Bank accounts and view real-time SMS sync logs.'
              : 'বিকাশ, নগদ, রকেট, ব্যাংক একাউন্ট সেটআপ এবং এসএমএস সিঙ্ক হিস্ট্রি মনিটর করুন।'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {activeTab === 'accounts' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-2.5 py-1.5 bg-primary text-black hover:bg-primary/95 rounded-lg flex items-center gap-1 font-semibold transition-all text-[12px]"
            >
              <Plus className="w-4 h-4" />
              {language === 'en' ? 'Add Account' : 'অ্যাকাউন্ট যোগ করুন'}
            </button>
          )}
          <button
            onClick={fetchData}
            className="p-1.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded-lg text-zinc-300"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-1">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-3 py-1.5 font-medium rounded-t-lg transition-all ${
            activeTab === 'accounts' 
              ? 'text-primary border-b-2 border-primary bg-zinc-900/40' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {language === 'en' ? 'MFS & Bank Accounts' : 'একউন্টসমূহ'}
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-3 py-1.5 font-medium rounded-t-lg transition-all ${
            activeTab === 'transactions' 
              ? 'text-primary border-b-2 border-primary bg-zinc-900/40' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {language === 'en' ? 'Synced SMS Logs' : 'এসএমএস ট্রানজেকশন লগ'}
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <AdminLoader message="Loading MFS & Bank Gateway accounts..." />
      ) : activeTab === 'accounts' ? (
        <div className="bg-white dark:bg-surface border border-slate-200 dark:border-surface-hover rounded-2xl overflow-hidden shadow-sm dark:shadow-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.length === 0 ? (
              <div className="col-span-full bg-slate-50 dark:bg-surface/30 border border-dashed border-slate-300 dark:border-zinc-800 rounded-xl p-8 text-center text-slate-500 dark:text-zinc-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {language === 'en' ? 'No Accounts Added Yet' : 'কোনো অ্যাকাউন্ট যুক্ত করা হয়নি'}
              </div>
            ) : (
              accounts.slice((accPage - 1) * accPageSize, accPage * accPageSize).map(acc => (
                <div 
                  key={acc.id} 
                  className={`bg-slate-50 dark:bg-surface/60 backdrop-blur-xl border rounded-xl p-3 relative hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between ${
                    acc.provider === 'BANGLA_QR' ? 'border-amber-500/40 shadow-md shadow-amber-500/5' : 'border-slate-200 dark:border-zinc-800'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        acc.provider === 'BKASH' ? 'bg-pink-600/20 text-pink-600 dark:text-pink-400' :
                        acc.provider === 'NAGAD' ? 'bg-orange-600/20 text-orange-600 dark:text-orange-400' :
                        acc.provider === 'ROCKET' ? 'bg-purple-600/20 text-purple-600 dark:text-purple-400' :
                        acc.provider === 'UPAY' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20' :
                        acc.provider === 'BANGLA_QR' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                        'bg-sky-600/20 text-sky-600 dark:text-sky-400'
                      }`}>
                        {acc.provider === 'BANGLA_QR' ? 'BANGLA QR (Universal)' : `${acc.provider} (${acc.accountType})`}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActive(acc)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            acc.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500'
                          }`}
                        >
                          {acc.isActive ? 'Active' : 'Disabled'}
                        </button>
                        <button
                          onClick={() => handleEditClick(acc)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-primary transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="p-1 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="font-mono text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{acc.number}</span>
                      <button 
                        onClick={() => copyToClipboard(acc.number)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-primary transition-colors cursor-pointer"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {acc.bankName && (
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-zinc-400">
                        <span className="font-medium text-slate-500 dark:text-zinc-500">Bank:</span> {acc.bankName} {acc.routingNumber ? `(Routing: ${acc.routingNumber})` : ''}
                      </div>
                    )}

                    {acc.merchantId && (
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-zinc-400">
                        <span className="font-medium text-slate-500 dark:text-zinc-500">Merchant ID:</span> {acc.merchantId}
                      </div>
                    )}

                    <div className="mt-1 text-[11px] text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                      <span className="font-medium text-slate-500 dark:text-zinc-500">Platform Charge:</span> 
                      <span className="text-amber-600 dark:text-amber-400 font-bold">{acc.chargePercent || '0'}%</span>
                    </div>

                    {acc.qrCodeUrl && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-950/20 p-1 rounded">
                        <QrCode className="w-3.5 h-3.5" />
                        <span className="truncate">{acc.qrCodeUrl}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-zinc-800/40 flex justify-between items-center text-[10px] text-slate-500 dark:text-zinc-500">
                    <span>Added: {new Date(acc.createdAt).toLocaleDateString()}</span>
                    <span>{acc.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <AdminPagination
            currentPage={accPage}
            totalItems={accounts.length}
            pageSize={accPageSize}
            onPageChange={setAccPage}
            onPageSizeChange={setAccPageSize}
          />
        </div>
      ) : (
        /* Transactions Logs */
        <div className="space-y-3">
          {/* Instructions Box */}
          <div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 space-y-2 text-[12px] text-slate-800 dark:text-zinc-300">
            <div className="font-bold text-primary flex items-center gap-1.5 mb-1">
              <AlertCircle className="w-4 h-4 text-primary" />
              {language === 'en' ? 'SMS Gateway Mobile App Sync Configurations' : 'এসএমএস গেটওয়ে মোবাইল অ্যাপ কনফিগারেশন গাইড'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="bg-white dark:bg-zinc-950/40 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-850 shadow-sm">
                <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-semibold block uppercase">1. Webhook Endpoint URL</span>
                <div className="flex items-center justify-between mt-1">
                  <code className="text-slate-900 dark:text-zinc-200 font-mono select-all text-[11px] break-all">{`${API}/mfs-payments/sms-webhook`}</code>
                  <button 
                    onClick={() => copyToClipboard(`${API}/mfs-payments/sms-webhook`)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-primary transition-colors shrink-0 ml-2 cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              <div className="bg-white dark:bg-zinc-950/40 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-850 shadow-sm">
                <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-semibold block uppercase">2. Security Gateway Key (Header: X-SMS-GATEWAY-API-KEY)</span>
                <div className="flex items-center justify-between mt-1">
                  <code className="text-slate-900 dark:text-zinc-200 font-mono select-all text-[11px]">{gatewayApiKey}</code>
                  <button 
                    onClick={() => copyToClipboard(gatewayApiKey)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-primary transition-colors shrink-0 ml-2 cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-slate-100 dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-800/40 rounded-lg p-2.5 space-y-2 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-[11px] text-slate-600 dark:text-zinc-400">
                  <span className="font-bold text-slate-900 dark:text-zinc-300">💡 {language === 'en' ? 'Zero-Config Official ZiniChat SMS Gateway:' : 'জিরো-কনফিগারেশন অফিশিয়াল ZiniChat অ্যাপ:'}</span>
                  <p className="mt-0.5">{language === 'en' 
                    ? 'Download the ZiniChat App with built-in ON/OFF toggles for bKash, Nagad, Rocket & BD Banks. Zero manual JSON or Regex typing required!' 
                    : 'ZiniChat কাস্টম অ্যাপ ডাউনলোড করুন। এর ভেতরে bKash, Nagad, Rocket ও Bank SMS এর বিল্ট-ইন অন/অফ সুইচ দেওয়া আছে। কোনো কোড বা টেমপ্লেট লেখা লাগবে না!'}</p>
                </div>
                <a
                  href="/downloads/zinichat-sms-gateway.apk"
                  download="zinichat-sms-gateway.apk"
                  className="px-2.5 py-1.5 bg-primary text-black font-semibold rounded-lg text-center hover:bg-primary/95 text-[11px] shrink-0"
                >
                  📥 Download ZiniChat SMS Gateway APK
                </a>
              </div>
            </div>
          </div>

          {/* Search Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white dark:bg-surface border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-slate-900 dark:text-white">Synced SMS Logs:</span>
              <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full">{filteredTransactions.length}</span>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder={language === 'en' ? 'Search TRX ID or SMS...' : 'TRX ID বা SMS সার্চ করুন...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white rounded-lg pl-9 pr-3 py-1.5 text-[12px] focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-surface border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm dark:shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-100/90 dark:bg-zinc-900/20 text-slate-700 dark:text-zinc-400 font-semibold text-[11px]">
                    <th className="p-2">Time</th>
                    <th className="p-2">Provider</th>
                    <th className="p-2">Trx ID</th>
                    <th className="p-2 text-right">Amount (BDT)</th>
                    <th className="p-2">Sender</th>
                    <th className="p-2 max-w-xs">SMS Content</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-900/50 text-slate-900 dark:text-zinc-300">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-zinc-500">
                        {language === 'en' ? 'No transactions synced' : 'কোনো ট্রানজেকশন মেলেনি'}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.slice((txPage - 1) * txPageSize, txPage * txPageSize).map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="p-2 text-[11px] text-slate-500 dark:text-zinc-500 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            tx.provider === 'BKASH' ? 'bg-pink-600/10 text-pink-600 dark:text-pink-400' :
                            tx.provider === 'NAGAD' ? 'bg-orange-600/10 text-orange-600 dark:text-orange-400' :
                            tx.provider === 'ROCKET' ? 'bg-purple-600/10 text-purple-600 dark:text-purple-400' :
                            tx.provider === 'UPAY' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                            tx.provider === 'BANGLA_QR' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                            'bg-sky-600/10 text-sky-600 dark:text-sky-400'
                          }`}>
                            {tx.provider}
                          </span>
                        </td>
                        <td className="p-2 font-mono font-bold text-slate-900 dark:text-zinc-200">
                          <span className="flex items-center gap-1.5">
                            {tx.trxId}
                            <button 
                              onClick={() => copyToClipboard(tx.trxId)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
                            >
                              <Clipboard className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        </td>
                        <td className="p-2 text-right font-bold text-primary">
                          {Number(tx.amount).toFixed(2)}
                        </td>
                        <td className="p-2 font-mono text-slate-600 dark:text-zinc-400">
                          {tx.senderNumber || '-'}
                        </td>
                        <td className="p-2 max-w-xs text-[11px] text-slate-600 dark:text-zinc-400 truncate" title={tx.smsBody}>
                          {tx.smsBody || '-'}
                        </td>
                        <td className="p-2 text-center">
                          {tx.isClaimed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              Claimed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              Unclaimed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <AdminPagination
              currentPage={txPage}
              totalItems={filteredTransactions.length}
              pageSize={txPageSize}
              onPageChange={setTxPage}
              onPageSizeChange={setTxPageSize}
            />
          </div>
        </div>
      )}

      {/* Add / Edit Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-[#0f0f11] border border-zinc-800 rounded-xl p-4 w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h2 className="text-[14px] font-bold text-primary">
                {editingAccount 
                  ? (language === 'en' ? 'Edit MFS / Bank Account' : 'অ্যাকাউন্ট সম্পাদনা করুন')
                  : (language === 'en' ? 'Add MFS / Bank Account' : 'নতুন অ্যাকাউন্ট যুক্ত করুন')}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={editingAccount ? handleUpdateAccount : handleAddAccount} className="space-y-3">
              <div>
                <label className="block text-[11px] text-zinc-400 font-medium mb-1">Provider Type</label>
                <select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value);
                    if (e.target.value === 'BANK') {
                      setAccountType('BANK_ACCOUNT');
                    } else if (e.target.value === 'BANGLA_QR') {
                      setAccountType('MERCHANT');
                    } else {
                      setAccountType('PERSONAL');
                    }
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary text-zinc-300"
                >
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="ROCKET">Rocket</option>
                  <option value="UPAY">upay</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="BANGLA_QR">Bangla QR (Universal)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 font-medium mb-1">Account Type</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  disabled={provider === 'BANK'}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary text-zinc-300 disabled:opacity-50"
                >
                  <option value="PERSONAL">Personal (Send Money)</option>
                  <option value="MERCHANT">Merchant / Retail (Make Payment)</option>
                  <option value="BANK_ACCOUNT" disabled={provider !== 'BANK'}>Bank Account</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 font-medium mb-1">
                  {provider === 'BANK' ? 'Account Number' : (provider === 'BANGLA_QR' ? 'Settlement Account / Mobile Number (Optional)' : 'MFS Mobile Number')}
                </label>
                <input
                  type="text"
                  required={provider !== 'BANGLA_QR'}
                  placeholder={provider === 'BANGLA_QR' ? 'Optional' : 'e.g. 017XXXXXXXX'}
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary text-zinc-300"
                />
              </div>

              {(accountType === 'MERCHANT' || provider === 'BANGLA_QR') && (
                <div>
                  <label className="block text-[11px] text-zinc-400 font-medium mb-1">
                    Merchant ID (PAN) {provider === 'BANGLA_QR' ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    required={provider === 'BANGLA_QR'}
                    placeholder={provider === 'BANGLA_QR' ? 'Mandatory for Bangla QR' : 'Used for Bangla QR payload'}
                    value={merchantId}
                    onChange={(e) => setMerchantId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary text-zinc-300"
                  />
                </div>
              )}

              {provider === 'BANK' && (
                <>
                  <div>
                    <label className="block text-[11px] text-zinc-400 font-medium mb-1">Bank Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. City Bank, Brac Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary text-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 font-medium mb-1">Routing Number</label>
                    <input
                      type="text"
                      required
                      placeholder="9 Digit routing number"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary text-zinc-300"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] text-zinc-400 font-medium mb-1">Platform Charge Fee (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  placeholder="e.g. 1.5"
                  value={chargePercent}
                  onChange={(e) => setChargePercent(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary text-zinc-300"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 font-medium mb-1">Static QR Image (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. /uploads/bkash_qr.jpg"
                    value={qrCodeUrl}
                    onChange={(e) => setQrCodeUrl(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary text-zinc-300 text-[12px]"
                  />
                  <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1">
                    <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block leading-tight">
                  {language === 'en' 
                    ? '* Leave blank to automatically generate dynamic Bangla QR on customer checkout.'
                    : '* খালি রাখলে পেমেন্ট পেজে স্বয়ংক্রিয়ভাবে ডাইনামিক বাংলা কিউআর তৈরি হবে।'}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded-lg text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {editingAccount 
                    ? (language === 'en' ? 'Save Changes' : 'পরিবর্তন সংরক্ষণ করুন')
                    : (language === 'en' ? 'Save Account' : 'সংরক্ষণ করুন')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
