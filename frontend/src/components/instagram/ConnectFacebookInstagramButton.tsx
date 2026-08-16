'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

interface IgAccount {
  id: string;
  username: string;
  pageName: string;
}

export default function ConnectFacebookInstagramButton({ onConnected }: { onConnected: () => void }) {
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [accounts, setAccounts] = useState<IgAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [fbToken, setFbToken] = useState('');

  useEffect(() => {
    if (document.getElementById('facebook-jssdk')) {
      setIsSdkLoaded(true);
      return;
    }
    
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v19.0',
      });
      setIsSdkLoaded(true);
    };

    const js = document.createElement('script');
    js.id = 'facebook-jssdk';
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    document.body.appendChild(js);
  }, []);

  const handleConnect = () => {
    if (!window.FB) {
      setMessage('Facebook SDK not loaded yet.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          const accessToken = response.authResponse.accessToken;
          sendTokenToBackend(accessToken);
        } else {
          setMessage('User cancelled login or did not fully authorize.');
          setIsLoading(false);
        }
      },
      {
        scope: 'instagram_basic,instagram_manage_messages,pages_show_list,pages_manage_metadata',
      }
    );
  };

  const sendTokenToBackend = async (token: string, igAccountId?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels/instagram/connect/facebook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify({ code: token, igAccountId }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresSelection) {
          // Step 1: Show account selector
          setAccounts(data.accounts);
          setFbToken(data.token);
          if (data.accounts.length > 0) {
            setSelectedAccountId(data.accounts[0].id);
          }
          setMessage('Please select the Instagram account you want to connect.');
        } else {
          // Step 2: Successfully connected
          setMessage('Instagram account connected successfully!');
          setAccounts([]);
          onConnected();
        }
      } else {
        setMessage(`Failed to connect: ${data.message}`);
      }
    } catch (error) {
      console.error(error);
      setMessage('Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountSelectSubmit = async () => {
    if (!selectedAccountId) {
      setMessage('Please select an account.');
      return;
    }
    await sendTokenToBackend(fbToken, selectedAccountId);
  };

  return (
    <div className="flex flex-col items-start gap-4 p-6 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 w-full max-w-md">
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Connect with Facebook</h3>
      <p className="text-slate-500 dark:text-zinc-400 text-sm">
        Link your Instagram Business Account (via Facebook) to receive Instagram DMs in your unified inbox.
      </p>

      {accounts.length === 0 ? (
        <button
          onClick={handleConnect}
          disabled={!isSdkLoaded || isLoading}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center gap-2"
        >
          {isLoading ? 'Fetching Accounts...' : 'Login with Facebook'}
        </button>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          <label htmlFor="ig-account-select" className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
            Select Instagram Account
          </label>
          <select
            id="ig-account-select"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                @{a.username} — {a.pageName}
              </option>
            ))}
          </select>
          <button
            onClick={handleAccountSelectSubmit}
            disabled={isLoading}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? 'Connecting...' : 'Connect Selected Account'}
          </button>
          <button
            onClick={() => { setAccounts([]); setFbToken(''); setMessage(''); }}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 underline text-left"
          >
            ← Go back
          </button>
        </div>
      )}

      {message && (
        <div className={`mt-2 p-3 text-sm rounded w-full ${
          message.includes('success')
            ? 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400'
            : message.includes('select')
            ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400'
            : 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}
