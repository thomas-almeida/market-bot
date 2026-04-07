import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001', {
  transports: ['websocket'],
});

export default socket;
