const TelegramBot = require('node-telegram-bot-api');
const Session = require('../models/Session');
const Transaction = require('../models/Transaction');
const BotConfig = require('../models/BotConfig');
const { getWelcomeMessage } = require('./messages');
const { sendDriveLink } = require('../services/bot.service');
const axios = require('axios');

let bot;

function getBot() {
  if (!bot) throw new Error('Bot not initialized');
  return bot;
}

function initBot(app) {
  if (bot) return bot;

  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
    // Clear webhook if it was set, to avoid 409 Conflict
    bot.deleteWebHook();
    console.log('Telegram bot running in polling mode');

    // Silent polling errors in dev to avoid noise from rapid restarts
    bot.on('polling_error', (err) => {
      if (err.message.includes('EFATAL')) {
        console.error('Fatal polling error:', err.message);
      }
    });
  } else {
    // In production, we don't start a separate webhook server.
    // We use the existing Express server to receive updates.
    bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
    
    const webhookUrl = `${process.env.SERVER_URL}/webhook/telegram`;
    bot.setWebHook(webhookUrl);
    console.log(`Telegram bot webhook set to: ${webhookUrl}`);
  }

  setupHandlers(bot);
  return bot;
}

function setupHandlers(bot) {
  bot.on('message', async (msg) => {
    try {
      await handleStart(bot, msg);
    } catch (err) {
      console.error('Bot message error:', err.message);
    }
  });

  bot.on('callback_query', async (query) => {
    try {
      await handleCallback(bot, query);
    } catch (err) {
      console.error('Bot callback error:', err.message);
    }
  });
}

async function handleStart(bot, msg) {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const firstName = msg.from.first_name || '';
  const username = msg.from.username || '';

  // Create session
  await Session.create({ telegramUserId: userId, username, firstName });

  // Get config
  const config = await BotConfig.getOrCreate();
  const welcomeMsg = getWelcomeMessage(config);

  // Send images if configured
  const welcomeImageUrls = Array.isArray(config.welcomeImageUrls) ? config.welcomeImageUrls : (config.welcomeImageUrl ? [config.welcomeImageUrl] : []);
  for (const imageUrl of welcomeImageUrls) {
    if (imageUrl) {
      await bot.sendPhoto(chatId, imageUrl);
    }
  }

  // Send welcome text
  await bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'HTML' });

  // Send product buttons
  const products = config.products && config.products.length > 0
    ? config.products
    : [
        { label: 'Pack de 50 conteúdos', price: 27.90, driveLink: 'https://drive.google.com/drive/folders/1H8QJdV9C9DXMPkpI5qxgJVnbDbgIiRHk?usp=sharing' },
        { label: 'Pack de 20 conteúdos', price: 19.90, driveLink: 'https://drive.google.com/drive/folders/1H8QJdV9C9DXMPkpI5qxgJVnbDbgIiRHk?usp=sharing' },
      ];

  const inlineKeyboard = {
    inline_keyboard: products.map((p, i) => [
      { text: `${p.label} — R$ ${p.price.toFixed(2).replace('.', ',')}`, callback_data: `buy_${i}` },
    ]),
  };

  await bot.sendMessage(chatId, 'Quer se divertir ? Hoje eu to com um desconto especial!', { reply_markup: inlineKeyboard });
}

async function handleCallback(bot, query) {
  const chatId = query.message.chat.id;
  const userId = String(query.from.id);
  const data = query.data;

  if (data.startsWith('buy_')) {
    await handleBuy(bot, query, chatId, userId);
  } else if (data.startsWith('check_payment')) {
    await handleCheckPayment(bot, query, chatId, userId);
  }
}

async function handleBuy(bot, query, chatId, userId) {
  const productIndex = parseInt(query.data.split('_')[1]);

  // Get config to resolve the product
  const config = await BotConfig.getOrCreate();
  const products = config.products && config.products.length > 0
    ? config.products
    : [
        { label: 'Pack de 50 conteúdos', price: 27.90, driveLink: 'https://drive.google.com/drive/folders/1H8QJdV9C9DXMPkpI5qxgJVnbDbgIiRHk?usp=sharing' },
        { label: 'Pack de 20 conteúdos', price: 19.90, driveLink: 'https://drive.google.com/drive/folders/1H8QJdV9C9DXMPkpI5qxgJVnbDbgIiRHk?usp=sharing' },
      ];

  const product = products[productIndex];
  if (!product) {
    return bot.answerCallbackQuery(query.id, { text: 'Produto inválido.', show_alert: true });
  }

  try {
    // Generate PIX via OrionPay
    const paymentResult = await axios.post(`${process.env.SERVER_URL || 'http://localhost:' + (process.env.PORT || 3001)}/api/payment/generate`, {
      telegramUserId: userId,
      productIndex,
    });

    const { pixCode, pixQrCodeUrl, transactionId } = paymentResult.data;

    // Send QR Code image
    await bot.sendPhoto(chatId, pixQrCodeUrl, {
      caption: '💳 Escaneie o QR Code abaixo para pagar via PIX.',
    });

    // Send Copy & Paste code
    await bot.sendMessage(chatId, `💠 Pague via Pix Copia e Cola (ou QR Code em alguns bancos):\n\n<pre>${pixCode}</pre>\n\n👆 Toque no código PIX acima para copiar\n\n‼️ SE O BOT NAO ENTREGAR ME CONTATE\n\nNao peça reembolso, caso o contrario nao ira ser entregue!! e pode ficar tranquilo que o pagamento é super discreto ❤`, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    // Send payment status button
    await bot.sendMessage(chatId, '⏳ Aguardando confirmação do pagamento...', {
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Já paguei — Verificar', callback_data: `check_payment|${transactionId}` },
        ]],
      },
    });

    bot.answerCallbackQuery(query.id);
  } catch (err) {
    console.error('Payment generation error:', err.message);
    bot.answerCallbackQuery(query.id, { text: 'Erro ao gerar pagamento. Tente novamente.', show_alert: true });
  }
}

async function handleCheckPayment(bot, query, chatId, userId) {
  const parts = query.data.split('|');
  const transactionId = parts[1];

  if (!transactionId) {
    return bot.answerCallbackQuery(query.id, { text: 'Transação não identificada.', show_alert: true });
  }

  try {
    console.log('Checking payment for transaction:', transactionId);
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return bot.answerCallbackQuery(query.id, { text: 'Transação não encontrada.', show_alert: true });
    }

    if (transaction.status === 'PAID') {
      const config = await BotConfig.getOrCreate();
      const product = config.products[transaction.productIndex];
      const linkToDeliver = transaction.driveLink || product?.driveLink;

      if (linkToDeliver) {
        await sendDriveLink(bot, chatId, linkToDeliver);
      } else {
        await bot.sendMessage(chatId, '✅ Pagamento confirmado! Entraremos em contato em breve para liberar o seu acesso.');
      }
      bot.answerCallbackQuery(query.id, { text: 'Pagamento confirmado!', show_alert: false });
    } else if (transaction.status === 'EXPIRED') {
      await bot.sendMessage(chatId, '⏰ Este PIX expirou. Deseja gerar um novo? Clique em um dos produtos acima.');
      bot.answerCallbackQuery(query.id, { text: 'Este PIX expirou. Gere um novo.', show_alert: false });
    } else {
      await bot.sendMessage(chatId, '⏳ Pagamento ainda não confirmado. Aguarde alguns instantes e tente novamente.');
      bot.answerCallbackQuery(query.id, { text: 'Aguardando pagamento...', show_alert: false });
    }
  } catch (err) {
    console.error('Check payment error:', err.message);
    bot.answerCallbackQuery(query.id, { text: 'Erro ao verificar pagamento.', show_alert: true });
  }
}

module.exports = { initBot, getBot };
