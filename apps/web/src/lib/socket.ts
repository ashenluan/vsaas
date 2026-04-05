import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = getAccessToken();
  if (!token) {
    throw new Error('No auth token');
  }

  socket = io(`${API_BASE}/ws`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    console.log('[WS] Connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[WS] Connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export type JobUpdateEvent = {
  jobId: string;
  status: string;
  progress?: number;
  output?: any;
  errorMsg?: string;
};

export function onJobUpdate(callback: (data: JobUpdateEvent) => void): () => void {
  const s = getSocket() || connectSocket();
  s.on('job:update', callback);
  return () => {
    s.off('job:update', callback);
  };
}

export function onJobComplete(jobId: string, callback: (data: JobUpdateEvent) => void): () => void {
  const handler = (data: JobUpdateEvent) => {
    if (data.jobId === jobId) callback(data);
  };
  const s = getSocket() || connectSocket();
  s.on('job:update', handler);
  return () => {
    s.off('job:update', handler);
  };
}
