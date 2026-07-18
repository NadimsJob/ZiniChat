'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

export default function ConnectWhatsAppButton() {
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Load the Facebook SDK asynchronously
    if (document.getElementById('facebook-jssdk')) return;
    
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
        config_id: 'YOUR_CONFIG_ID', // Replace with the Configuration ID from Meta Dashboard
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
        },
      }
    );
  };

  const sendTokenToBackend = async (code: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/webhooks/whatsapp/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }), // Meta Embedded Signup returns a code to be exchanged
      });

      if (response.ok) {
        setMessage('WhatsApp connected successfully!');
      } else {
        setMessage('Failed to connect WhatsApp to the platform.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-4 p-6 bg-slate-800 rounded-xl border border-slate-700">
      <h3 className="text-xl font-semibold text-white">Connect WhatsApp</h3>
      <p className="text-slate-400 text-sm">
        Link your WhatsApp Business account to start receiving messages in your unified inbox.
      </p>
      
      <button
        onClick={handleConnect}
        disabled={!isSdkLoaded || isLoading}
        className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
      >
        {isLoading ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.571-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
        )}
        Connect with Meta
      </button>

      {message && (
        <p className={`text-sm ${message.includes('success') ? 'text-green-400' : 'text-amber-400'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
