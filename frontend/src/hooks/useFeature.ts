'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let cachedFeatures: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

async function getOrFetchFeatures(): Promise<string[]> {
  if (cachedFeatures) return cachedFeatures;
  if (fetchPromise) return fetchPromise;

  const token = Cookies.get('access_token');
  if (!token) return [];

  fetchPromise = fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(user => {
      if (user && Array.isArray(user.features)) {
        cachedFeatures = user.features;
        return user.features;
      }
      return [];
    })
    .catch(() => [])
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

export function clearFeatureCache() {
  cachedFeatures = null;
}

export function useFeature(featureKey: string): boolean {
  const [hasFeature, setHasFeature] = useState<boolean>(true);

  useEffect(() => {
    getOrFetchFeatures().then(features => {
      if (features.length > 0) {
        setHasFeature(features.includes(featureKey));
      }
    });
  }, [featureKey]);

  return hasFeature;
}

export function useFeatures(): string[] {
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    getOrFetchFeatures().then(list => setFeatures(list));
  }, []);

  return features;
}
