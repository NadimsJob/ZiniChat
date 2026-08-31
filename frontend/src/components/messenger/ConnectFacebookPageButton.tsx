'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

export default function ConnectFacebookPageButton({ onConnected }: { onConnected: () => void }) {
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [fbCode, setFbCode] = useState('');

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
          setFbCode(accessToken);
          sendTokenToBackend(accessToken);
        } else {
          setMessage('User cancelled login or did not fully authorize.');
          setIsLoading(false);
        }
      },
      {
        scope: 'pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement,pages_manage_engagement', // Required scopes for Messenger & Comment Automation
      }
    );
  };

  const sendTokenToBackend = async (code: string, pageId?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels/messenger/connect/facebook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify({ code, pageId }), 
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresSelection) {
          setPages(data.pages);
          if (data.pages.length > 0) {
            setSelectedPageId(data.pages[0].id);
          }
          setMessage('Please select the Facebook Page you want to connect.');
        } else {
          setMessage('Messenger Page connected successfully!');
          setPages([]);
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

  const handlePageSelectSubmit = async () => {
    if (!selectedPageId) {
      setMessage('Please select a page.');
      return;
    }
    await sendTokenToBackend(fbCode, selectedPageId);
  };

  return (
    <div className="flex flex-col items-start gap-4 p-6 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 w-full max-w-md">
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Connect with Facebook</h3>
      <p className="text-slate-500 dark:text-zinc-400 text-sm">
        Link your Facebook Page to start receiving Messenger messages in your unified inbox.
      </p>
      
      {pages.length === 0 ? (
        <button
          onClick={handleConnect}
          disabled={!isSdkLoaded || isLoading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {isLoading ? 'Connecting...' : 'Login with Facebook'}
        </button>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
            Select Facebook Page
          </label>
          <div className="flex flex-col gap-3 w-full max-h-[300px] overflow-y-auto pr-2">
            {pages.map((p) => (
              <div 
                key={p.id}
                onClick={() => setSelectedPageId(p.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedPageId === p.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm' : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-blue-300'}`}
              >
                <img 
                  src={`https://graph.facebook.com/${p.id}/picture?type=normal`} 
                  alt={p.name} 
                  className="w-10 h-10 rounded-full bg-slate-100 object-cover shrink-0 border border-slate-200" 
                />
                <span className="font-semibold text-sm text-slate-900 dark:text-white flex-1 truncate">{p.name}</span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedPageId === p.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                  {selectedPageId === p.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handlePageSelectSubmit}
            disabled={isLoading}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? 'Connecting Page...' : 'Connect Selected Page'}
          </button>
        </div>
      )}

      {message && (
        <div className={`mt-2 p-3 text-sm rounded w-full ${message.includes('successfully') ? 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
