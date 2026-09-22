import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export function useRolloutFlag(featureKey: string) {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const checkFlag = async () => {
      try {
        const token = Cookies.get('access_token');
        if (!token) {
          if (isMounted) {
            setEnabled(false);
            setLoading(false);
          }
          return;
        }

        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API}/feature-rollout/${featureKey}/check`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setEnabled(data.enabled);
          }
        } else {
            // Default to false if error status
             if (isMounted) setEnabled(false);
        }
      } catch (err) {
        console.error(`Failed to check feature rollout flag [${featureKey}]:`, err);
        if (isMounted) setEnabled(false);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkFlag();

    return () => {
      isMounted = false;
    };
  }, [featureKey]);

  return { enabled, loading };
}
