import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('token');
    const url = import.meta.env.VITE_API_URL || '/';
    socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function resetSocket() {
  socket?.disconnect();
  socket = null;
}

export function sendGameEvent(type: string, data: Record<string, unknown> = {}) {
  getSocket().emit('game:event', { type, data });
}
