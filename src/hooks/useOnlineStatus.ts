
"use client";

import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true); // Assume online by default

  useEffect(() => {
    // Check navigator.onLine support and initial status
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      setIsOnline(navigator.onLine);
    } else {
      // Fallback for environments where navigator.onLine is not supported (e.g., some server-side rendering scenarios initially)
      // You might want to implement a more robust check here if needed, like a small network request.
      setIsOnline(true); 
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
