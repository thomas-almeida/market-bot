function getWelcomeMessage(config) {
  return config.welcomeMessage || 'Olá! 👆 Confira nossos packs exclusivos abaixo.';
}

module.exports = { getWelcomeMessage };