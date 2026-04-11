import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_WS_URL || 'https://bot-morpheuspay.onrender.com', {
  transports: ['websocket'],
});

export default socket;
