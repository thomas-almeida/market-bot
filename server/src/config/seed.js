const BotConfig = require('../models/BotConfig');

async function seedBotConfig() {
  const count = await BotConfig.countDocuments();
  if (count === 0) {
    await BotConfig.create({
      welcomeMessage: 'Olá! 👋 Confira nossos packs exclusivos abaixo.',
      products: [
        { label: 'Pack de 50 conteúdos', price: 27.90, driveLink: 'https://drive.google.com/drive/folders/1H8QJdV9C9DXMPkpI5qxgJVnbDbgIiRHk?usp=sharing' },
        { label: 'Pack de 20 conteúdos', price: 19.90, driveLink: 'https://drive.google.com/drive/folders/1H8QJdV9C9DXMPkpI5qxgJVnbDbgIiRHk?usp=sharing' },
      ],
    });
    console.log('BotConfig seeded with default values');
  }
}

module.exports = { seedBotConfig };
