'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { connectSocket, disconnectSocket, getSocket, type JobUpdateEvent } from '@/lib/socket';
import { getAccessToken } from '@/lib/auth';
import type { Socket } from 'socket.io-client';

type WsContextValue = {
  connected: boolean;
  subscribe: (event: string, handler: (data: any) => void) => () => void;
};

const WsContext = createContext<WsContextValue>({
  connected: false,
  subscribe: () => () => {},
});

export function WsProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const s = connectSocket();
      socketRef.current = s;

      s.on('connect', () => setConnected(true));
      s.on('disconnect', () => setConnected(false));

      return () => {
        disconnectSocket();
        setConnected(false);
      };
    } catch {
      // no token
    }
  }, []);

  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    const s = socketRef.current || getSocket();
    if (!s) return () => {};
    s.on(event, handler);
    return () => { s.off(event, handler); };
  }, []);

  return (
    <WsContext.Provider value={{ connected, subscribe }}>
      {children}
    </WsContext.Provider>
  );
}

export function useWs() {
  return useContext(WsContext);
}

export function useJobUpdates(jobId: string | null, onUpdate: (data: JobUpdateEvent) => void) {
  const { subscribe } = useWs();
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    if (!jobId) return;
    // Listen to both generic job:update and mixcut-specific events
    const unsub1 = subscribe('job:update', (data: JobUpdateEvent) => {
      if (data.jobId === jobId) callbackRef.current(data);
    });
    const unsub2 = subscribe('mixcut:progress', (data: any) => {
      if (data.jobId === jobId) callbackRef.current(data);
    });
    return () => { unsub1(); unsub2(); };
  }, [jobId, subscribe]);
}
