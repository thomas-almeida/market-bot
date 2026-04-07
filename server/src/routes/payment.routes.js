const { Router } = require('express');
const Transaction = require('../models/Transaction');
const BotConfig = require('../models/BotConfig');
const { generatePixPayment } = require('../services/orionpay.service');
const { validateWebhook } = require('../services/webhook.service');
const { emitPaymentSuccess } = require('../services/socket.service');
const { sendDriveLink } = require('../services/bot.service');
const { getBot } = require('../bot/bot');

const router = Router();

router.post('/generate', async (req, res) => {
  try {
    const { telegramUserId, productIndex } = req.body;

    if (!telegramUserId || productIndex === undefined) {
      return res.status(400).json({ error: true, message: 'telegramUserId and productIndex required' });
    }

    const config = await BotConfig.getOrCreate();
    const products = config.products && config.products.length > 0
      ? config.products
      : [
        { label: 'Pack de 50 conteúdos', price: 27.90 },
        { label: 'Pack de 20 conteúdos', price: 19.90 },
      ];

    const product = products[productIndex];
    if (!product) {
      return res.status(400).json({ error: true, message: 'Invalid product index' });
    }

    const paymentResult = await generatePixPayment({
      amount: product.price,
      name: 'Cliente PIX',
      email: 'telegramuser@gmail.com',
    });

    console.log('Payment generated:', paymentResult);

    const { pixCode, qrCode, id } = paymentResult.data;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    if (paymentResult) {
      console.log('Pix Code:', pixCode);
      console.log('QR Code URL:', qrCode);
      console.log('Gateway Transaction ID:', id);

      const transaction = await Transaction.create({
        telegramUserId,
        productIndex,
        productLabel: product.label,
        amount: product.price,
        driveLink: product.driveLink, // Congela o link na transação
        pixCode,
        pixQrCodeUrl: qrCode,
        gatewayTransactionId: id,
        expiresAt,
      });

      res.json({
        pixCode,
        pixQrCodeUrl: qrCode,
        transactionId: transaction._id.toString(),
      });
    } else {
      res.status(500).json({ error: true, message: 'Failed to generate payment' });
    }

  } catch (err) {
    console.error('Payment generate error:', err.message);
    res.status(500).json({ error: true, message: 'Failed to generate payment' });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const secret = process.env.WEBHOOK_SECRET || process.env.ORION_API_KEY;

    console.log('--- Incoming Webhook Request ---');
    console.log('Event Name:', req.body.event);
    console.log('Full Body:', JSON.stringify(req.body, null, 2));

    if (!validateWebhook(req, secret)) {
      console.log('Error: Invalid webhook signature');
      return res.status(401).json({ error: true, message: 'Invalid signature' });
    }

    const { event, data } = req.body;

    if (event === 'payment.success') {
      const transactionId = data.transactionId || data.id || data.purchaseId;
      console.log('Searching for Transaction with ID:', transactionId);

      const transaction = await Transaction.findOne({
        gatewayTransactionId: transactionId,
      });

      if (!transaction) {
        console.log('Error: Transaction not found in local database');
        return res.json({ received: false, reason: 'Transaction not found' });
      }

      if (transaction.status !== 'PAID') {
        console.log(`Confirming payment for user ${transaction.telegramUserId}...`);
        
        await Transaction.findByIdAndUpdate(transaction._id, {
          status: 'PAID',
          paidAt: new Date(),
        });

        const config = await BotConfig.getOrCreate();
        const product = config.products[transaction.productIndex];
        const linkToDeliver = transaction.driveLink || product?.driveLink;

        if (linkToDeliver) {
          try {
            console.log('Sending drive link to Telegram...');
            const botInstance = getBot();
            await sendDriveLink(botInstance, transaction.telegramUserId, linkToDeliver);
            console.log('Drive link sent successfully');
          } catch (err) {
            console.error('Failed to send Drive link via webhook:', err.message);
          }
        } else {
          console.log('Error: No drive link found to deliver');
        }

        emitPaymentSuccess({
          transactionId: transaction._id.toString(),
          telegramUserId: transaction.telegramUserId,
          productLabel: transaction.productLabel,
          amount: transaction.amount,
          paidAt: new Date(),
        });
      } else {
        console.log('Transaction was already marked as PAID');
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: true, message: 'Webhook processing failed' });
  }
});

router.get('/check/:transactionId', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId);

    if (!transaction) {
      return res.status(404).json({ error: true, message: 'Transaction not found' });
    }

    res.json({
      status: transaction.status,
      transactionId: transaction._id.toString(),
      paidAt: transaction.paidAt,
    });
  } catch (err) {
    console.error('Check payment error:', err.message);
    res.status(500).json({ error: true, message: 'Failed to check payment' });
  }
});

module.exports = router;
