const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  telegramUserId: { type: String, required: true, index: true },
  username: String,
  firstName: String,
  startedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Session', SessionSchema);
