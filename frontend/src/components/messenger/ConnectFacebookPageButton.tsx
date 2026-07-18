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
        scope: 'pages_messaging,pages_show_list,pages_manage_metadata', // Required scopes for Messenger
      }
    );
  };

  const sendTokenToBackend = async (code: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels/messenger/connect/facebook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token')}`
        },
        body: JSON.stringify({ code }), 
      });

      if (response.ok) {
        setMessage('Messenger Page connected successfully!');
        onConnected();
      } else {
        const errorData = await response.json();
        setMessage(`Failed to connect: ${errorData.message}`);
      }
    } catch (error) {
      console.error(error);
      setMessage('Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-4 p-6 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Connect with Facebook</h3>
      <p className="text-slate-500 dark:text-zinc-400 text-sm">
        Link your Facebook Page to start receiving Messenger messages in your unified inbox.
      </p>
      
      <button
        onClick={handleConnect}
        disabled={!isSdkLoaded || isLoading}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
      >
        {isLoading ? 'Connecting...' : 'Login with Facebook'}
      </button>

      {message && (
        <div className={`mt-2 p-3 text-sm rounded ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
