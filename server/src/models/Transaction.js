const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'BotConfig', required: true, index: true },
  telegramUserId: { type: String, required: true, index: true },
  productIndex: { type: Number, required: true },
  productLabel: { type: String, required: true },
  amount: { type: Number, required: true },
  driveLink: { type: String }, // Link que será entregue ao usuário
  pixCode: { type: String, required: true },
  pixQrCodeUrl: { type: String, required: true },
  gatewayTransactionId: { type: String, index: true },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'EXPIRED'],
    default: 'PENDING',
  },
  createdAt: { type: Date, default: Date.now },
  paidAt: Date,
  expiresAt: { type: Date, required: true },
});

module.exports = mongoose.model('Transaction', TransactionSchema);
