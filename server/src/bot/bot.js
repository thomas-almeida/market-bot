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
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
    console.log('Telegram bot running in polling mode');
  } else {
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { webHook: { port: process.env.WEBHOOK_PORT || 8443 } });
    bot.setWebHook(webhookUrl);
    console.log(`Telegram bot running in webhook mode: ${webhookUrl}`);
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
        { label: 'Pack de 50 conteúdos', price: 27.90 },
        { label: 'Pack de 20 conteúdos', price: 19.90 },
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
  } else if (data === 'copy_pix') {
    bot.answerCallbackQuery(query.id, { text: 'Código copiado! Abra seu app de banco e cole o código PIX.', show_alert: false });
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
        { label: 'Pack de 50 conteúdos', price: 27.90 },
        { label: 'Pack de 20 conteúdos', price: 19.90 },
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
    await bot.sendMessage(chatId, `💠 Pague via Pix Copia e Cola (ou QR Code em alguns bancos):\n\n<blockquote>${pixCode}</blockquote> \n\n👆 Toque na chave PIX acima para copiá-la \n\nOu toque no botão abaixo para copiar. \n\n‼️ SE O BOT NAO ENTREGAR ME CONTATE \n\n Nao peça reembolso, caso o contrario nao ira ser entregue!! bjos da bia ❤`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '📋 Copiar código', callback_data: 'copy_pix' },
        ]],
      },
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
      if (product && product.driveLink) {
        await sendDriveLink(bot, chatId, product.driveLink);
      } else {
        await bot.sendMessage(chatId, '✅ Pagamento confirmado! Entraremos em contato em breve.');
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
