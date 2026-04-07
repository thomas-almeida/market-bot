const BotConfig = require('../models/BotConfig');

async function seedBotConfig() {
  const count = await BotConfig.countDocuments();
  if (count === 0) {
    await BotConfig.create({
      welcomeMessage: 'Olá! 👋 Confira nossos packs exclusivos abaixo.',
      products: [
        { label: 'Pack de 50 conteúdos', price: 27.90, driveLink: '' },
        { label: 'Pack de 20 conteúdos', price: 19.90, driveLink: '' },
      ],
    });
    console.log('BotConfig seeded with default values');
  }
}

module.exports = { seedBotConfig };
