const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'BotConfig', index: true },
  telegramUserId: { type: String, required: true, index: true },
  username: String,
  firstName: String,
  startedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Session', SessionSchema);
