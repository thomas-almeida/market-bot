function sendDriveLink(bot, chatId, driveLink) {
  bot.sendMessage(chatId, '✅ Pagamento confirmado! Acesse seu conteúdo pelo link abaixo:', {
    parse_mode: 'Markdown',
  });
  bot.sendMessage(chatId, driveLink, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
}

module.exports = { sendDriveLink };
