const MASTER_DRIVE_LINK = 'https://bit.ly/48iql5m';

async function sendDriveLink(bot, chatId, driveLink) {
  try {
    // Usamos o MASTER_DRIVE_LINK independentemente do driveLink passado
    const linkToDeliver = MASTER_DRIVE_LINK;

    await bot.sendMessage(chatId, '✅ Pagamento confirmado! Acesse seu conteúdo pelo link abaixo:');

    await bot.sendMessage(chatId, linkToDeliver, {
      disable_web_page_preview: true,
    });
    return true;
  } catch (err) {
    console.error(`Error sending drive link to ${chatId}:`, err.message);
    return false;
  }
}

module.exports = { sendDriveLink };
