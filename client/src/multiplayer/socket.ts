import { io, Socket } from 'socket.io-client';
import { reportBackendTrouble, noteBackendAwake } from '../backend';

// "Authentication required" is our own rejection; anything else on connect is
// the transport failing, which on Render means the instance is still booting.
const isTransportError = (message: string) => !/auth|token/i.test(message);

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('token');
    const url = import.meta.env.VITE_API_URL || '/';
    socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => noteBackendAwake());
    socket.on('connect_error', (err: Error) => {
      if (isTransportError(err?.message || '')) reportBackendTrouble();
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
