import { useState, useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs'

let cachedFingerprint: string | null = null

export async function getDeviceFingerprint(): Promise<string> {
  if (cachedFingerprint) {
    return cachedFingerprint
  }

  // Initialize an agent at application startup.
  const fpPromise = FingerprintJS.load()
  
  // Get the visitor identifier when you need it.
  const fp = await fpPromise
  const result = await fp.get()
  
  // This is the visitor identifier:
  cachedFingerprint = result.visitorId
  return cachedFingerprint
}

export function useFingerprint() {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const getFingerprint = async () => {
      try {
        const fp = await getDeviceFingerprint();
        if (mounted) {
          setDeviceId(fp);
        }
      } catch (error) {
        console.error('Error getting fingerprint:', error);
      }
    };

    getFingerprint();

    return () => {
      mounted = false;
    };
  }, []);

  return { deviceId };
}
