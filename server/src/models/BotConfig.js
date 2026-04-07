const mongoose = require('mongoose');

const BotConfigSchema = new mongoose.Schema({
  welcomeImageUrls: { type: [String], default: [] },
  welcomeMessage: { type: String, default: 'Olá! 👋 Confira nossos packs exclusivos abaixo.' },
  products: [
    {
      label: { type: String, required: true },
      price: { type: Number, required: true },
      driveLink: { type: String, default: '' },
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

// Ensure only 1 document exists
BotConfigSchema.statics.getOrCreate = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({
      welcomeMessage: 'Olá! 👋 Confira nossos packs exclusivos abaixo.',
      welcomeImageUrls: [],
      products: [
        { label: 'Pack de 50 conteúdos', price: 27.90, driveLink: '' },
        { label: 'Pack de 20 conteúdos', price: 19.90, driveLink: '' },
      ],
    });
  }
  return config;
};

module.exports = mongoose.model('BotConfig', BotConfigSchema);