const mongoose = require('mongoose');

const BotConfigSchema = new mongoose.Schema({
  name: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  active: { type: Boolean, default: true },
  welcomeImageUrls: { type: [String], default: [] },
  welcomeMessage: { type: String, default: 'Olá! 👋 Confira nossos packs exclusivos abaixo.' },
  masterDriveLink: { type: String, default: '' },
  products: [
    {
      label: { type: String, required: true },
      price: { type: Number, required: true },
      driveLink: { type: String, default: '' },
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BotConfig', BotConfigSchema);