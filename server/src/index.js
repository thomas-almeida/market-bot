require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const { seedBotConfig } = require('./config/seed');
const { initSocketServer } = require('./services/socket.service');
const { initBot } = require('./bot/bot');
const { startExpireJobs } = require('./jobs/expireTransactions');

const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');

async function start() {
  const app = express();
  const server = http.createServer(app);

  // Middleware
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));

  // Parse JSON - webhook needs raw body for signature validation
  app.use(express.json({ limit: '10mb' }));

  // Init DB
  await connectDB();
  await seedBotConfig();

  // Init Socket.IO
  initSocketServer(server);

  // Routes
  app.use('/webhook/telegram', express.json(), (req, res) => {
    try {
      if (process.env.NODE_ENV !== 'production') return res.sendStatus(200);
      const bot = require('./bot/bot');
      bot.getBot().processUpdate(req.body);
      res.sendStatus(200);
    } catch (err) {
      res.sendStatus(200);
    }
  });

  app.use('/api/payment', paymentRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/ping', (req, res) => res.json({ ok: true }));

  // Health check
  app.get('/health', (req, res) => res.json({ ok: true }));

  // Start cron jobs
  startExpireJobs();

  // Start bot
  initBot(app);

  // Start server
  const port = process.env.PORT || 3001;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
