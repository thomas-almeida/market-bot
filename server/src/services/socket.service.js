const { Server } = require('socket.io');

let io;

function initSocketServer(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Socket.IO connected:', socket.id);

    socket.on('join_admin', () => {
      socket.join('admin_events');
      console.log(`Socket ${socket.id} joined admin_events`);
    });

    socket.on('join_transaction', (transactionId) => {
      socket.join(transactionId);
      console.log(`Socket ${socket.id} joined room: ${transactionId}`);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected:', socket.id);
    });
  });

  return io;
}

function emitPaymentSuccess({ transactionId, telegramUserId, productLabel, amount, paidAt }) {
  if (!io) return;
  const payload = { transactionId, telegramUserId, productLabel, amount, paidAt };
  io.to('admin_events').emit('payment_success', payload);
  io.to(transactionId).emit('payment_success', payload);
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

module.exports = { initSocketServer, emitPaymentSuccess, getIO };
