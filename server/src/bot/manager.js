const TelegramBot = require('node-telegram-bot-api');
const Session = require('../models/Session');
const Transaction = require('../models/Transaction');
const BotConfig = require('../models/BotConfig');
const { getWelcomeMessage } = require('./messages');
const { sendDriveLink } = require('../services/bot.service');
const axios = require('axios');

const bots = new Map();

function getBot(botId) {
  const bot = bots.get(botId.toString());
  if (!bot) throw new Error(`Bot ${botId} not initialized`);
  return bot;
}

async function initAllBots() {
  const configs = await BotConfig.find({ active: true });
  console.log(`Initializing ${configs.length} bots...`);
  for (const config of configs) {
    try {
      await addBot(config);
    } catch (err) {
      console.error(`Failed to initialize bot ${config.name}:`, err.message);
    }
  }
}

async function addBot(config) {
  const isDev = process.env.NODE_ENV !== 'production';
  let bot;

  if (isDev) {
    bot = new TelegramBot(config.token, { polling: true });
    await bot.deleteWebHook();
    console.log(`Bot ${config.name} running in polling mode`);

    bot.on('polling_error', (err) => {
      if (err.message.includes('EFATAL')) {
        console.error(`Fatal polling error for ${config.name}:`, err.message);
      }
    });
  } else {
    bot = new TelegramBot(config.token);
    const webhookUrl = `${process.env.SERVER_URL}/webhook/telegram/${config._id}`;
    await bot.setWebHook(webhookUrl);
    console.log(`Bot ${config.name} webhook set to: ${webhookUrl}`);
  }

  setupHandlers(bot, config._id);
  bots.set(config._id.toString(), bot);
  return bot;
}

function stopBot(botId) {
  const bot = bots.get(botId.toString());
  if (bot) {
    if (bot.isPolling()) {
      bot.stopPolling();
    }
    bots.delete(botId.toString());
  }
}

function setupHandlers(bot, botId) {
  bot.on('message', async (msg) => {
    try {
      await handleStart(bot, botId, msg);
    } catch (err) {
      console.error(`Bot ${botId} message error:`, err.message);
    }
  });

  bot.on('callback_query', async (query) => {
    try {
      await handleCallback(bot, botId, query);
    } catch (err) {
      console.error(`Bot ${botId} callback error:`, err.message);
    }
  });
}

async function handleStart(bot, botId, msg) {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const firstName = msg.from.first_name || '';
  const username = msg.from.username || '';

  // Create session
  await Session.create({ botId, telegramUserId: userId, username, firstName });

  // Get config for this specific bot
  const config = await BotConfig.findById(botId);
  if (!config) return;

  const welcomeMsg = getWelcomeMessage(config);

  // Send images if configured
  const welcomeImageUrls = Array.isArray(config.welcomeImageUrls) ? config.welcomeImageUrls : [];
  for (const imageUrl of welcomeImageUrls) {
    if (imageUrl) {
      await bot.sendPhoto(chatId, imageUrl);
    }
  }

  // Send welcome text
  await bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'HTML' });

  // Send product buttons
  const products = config.products && config.products.length > 0 ? config.products : [];

  const inlineKeyboard = {
    inline_keyboard: products.map((p, i) => [
      { text: `${p.label} — R$ ${p.price.toFixed(2).replace('.', ',')}`, callback_data: `buy_${i}` },
    ]),
  };

  await bot.sendMessage(chatId, 'Quer se divertir ? Hoje eu to com um desconto especial!', { reply_markup: inlineKeyboard });
}

async function handleCallback(bot, botId, query) {
  const chatId = query.message.chat.id;
  const userId = String(query.from.id);
  const data = query.data;

  try {
    await bot.answerCallbackQuery(query.id).catch(() => {});
  } catch (e) {}

  if (data.startsWith('buy_')) {
    await handleBuy(bot, botId, query, chatId, userId);
  } else if (data.startsWith('check_payment')) {
    await handleCheckPayment(bot, botId, query, chatId, userId);
  }
}

async function handleBuy(bot, botId, query, chatId, userId) {
  const productIndex = parseInt(query.data.split('_')[1]);

  const config = await BotConfig.findById(botId);
  if (!config || !config.products[productIndex]) return;

  try {
    const paymentResult = await axios.post(`${process.env.SERVER_URL || 'http://localhost:' + (process.env.PORT || 3001)}/api/payment/generate`, {
      telegramUserId: userId,
      productIndex,
      botId: botId.toString()
    });

    const { pixCode, pixQrCodeUrl, transactionId } = paymentResult.data;

    await bot.sendPhoto(chatId, pixQrCodeUrl, {
      caption: '💳 Escaneie o QR Code abaixo para pagar via PIX.',
    });

    await bot.sendMessage(chatId, `💠 Pague via Pix Copia e Cola (ou QR Code em alguns bancos):\n\n<pre>${pixCode}</pre>\n\n👆 Toque no código PIX acima para copiar\n\n‼️ SE O BOT NAO ENTREGAR ME CONTATE\n\nNao peça reembolso, caso o contrario nao ira ser entregue!! e pode ficar tranquilo que o pagamento é super discreto ❤`, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    await bot.sendMessage(chatId, '⏳ Aguardando confirmação do pagamento...', {
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Já paguei — Verificar', callback_data: `check_payment|${transactionId}` },
        ]],
      },
    });
  } catch (err) {
    console.error('Payment generation error:', err.message);
    await bot.sendMessage(chatId, '❌ Erro ao gerar pagamento. Tente novamente mais tarde.');
  }
}

async function handleCheckPayment(bot, botId, query, chatId, userId) {
  const parts = query.data.split('|');
  const transactionId = parts[1];

  if (!transactionId) return;

  try {
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      await bot.sendMessage(chatId, '❌ Transação não encontrada.');
      return;
    }

    if (transaction.status === 'PAID') {
      const config = await BotConfig.findById(botId);
      await sendDriveLink(bot, chatId, config?.masterDriveLink);
    } else if (transaction.status === 'EXPIRED') {
      await bot.sendMessage(chatId, '⏰ Este PIX expirou. Deseja gerar um novo? Clique em um dos produtos acima.');
    } else {
      await bot.sendMessage(chatId, '⏳ Pagamento ainda não confirmado. Aguarde alguns instantes e tente novamente.');
    }
  } catch (err) {
    console.error('Check payment error:', err.message);
    await bot.sendMessage(chatId, '❌ Erro ao verificar pagamento. Tente novamente.');
  }
}

module.exports = { initAllBots, getBot, addBot, stopBot };