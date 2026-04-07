const MASTER_DRIVE_LINK = 'https://drive.google.com/drive/folders/1mxpgobwwnt2EW_spd1S39-K4DEpuE1YS?usp=sharing';

async function sendDriveLink(bot, chatId, driveLink) {
  try {
    // Usamos o MASTER_DRIVE_LINK independentemente do driveLink passado
    const linkToDeliver = MASTER_DRIVE_LINK;

    await bot.sendMessage(chatId, '✅ Pagamento confirmado! Acesse seu conteúdo pelo link abaixo:', {
      parse_mode: 'Markdown',
    });
    await bot.sendMessage(chatId, linkToDeliver, {
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
