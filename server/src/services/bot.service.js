async function sendDriveLink(bot, chatId, driveLink) {
  try {
    await bot.sendMessage(chatId, '✅ Pagamento confirmado! Acesse seu conteúdo pelo link abaixo:', {
      parse_mode: 'Markdown',
    });
    await bot.sendMessage(chatId, driveLink, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    });
    return true;
  } catch (err) {
    console.error(`Error sending drive link to ${chatId}:`, err.message);
    return false;
  }
}

module.exports = { sendDriveLink };
