require('dotenv').config();
const mongoose = require('mongoose');
const BotConfig = require('./src/models/BotConfig');
const Transaction = require('./src/models/Transaction');
const Session = require('./src/models/Session');
const connectDB = require('./src/config/db');

async function migrate() {
  try {
    await connectDB();
    console.log('🚀 Iniciando migração para Multi-Bot...');

    // 1. Verificar se já existe um bot configurado
    let defaultBot = await BotConfig.findOne();

    if (!defaultBot) {
      console.log('⚠️ Nenhuma configuração encontrada. O seed padrão cuidará disso na inicialização.');
    } else if (!defaultBot.token) {
      console.log('📦 Atualizando configuração existente para o formato Multi-Bot...');
      
      const token = process.env.TELEGRAM_TOKEN;
      if (!token) {
        throw new Error('❌ Erro: TELEGRAM_TOKEN não encontrado no .env. Impossível migrar sem o token.');
      }

      defaultBot.name = 'Bot Principal (Migrado)';
      defaultBot.token = token;
      defaultBot.active = true;
      await defaultBot.save();
      
      console.log(`✅ Configuração do bot "${defaultBot.name}" atualizada com sucesso.`);
    } else {
      console.log('ℹ️ O bot já possui um token configurado. Pulando etapa de configuração.');
    }

    // Recarregar o bot para garantir que temos o ID
    defaultBot = await BotConfig.findOne();

    if (defaultBot) {
      // 2. Vincular Transações órfãs ao Bot Principal
      const txUpdate = await Transaction.updateMany(
        { botId: { $exists: false } },
        { $set: { botId: defaultBot._id } }
      );
      console.log(`✅ ${txUpdate.modifiedCount} transações vinculadas ao bot principal.`);

      // 3. Vincular Sessões órfãs ao Bot Principal
      const sessionUpdate = await Session.updateMany(
        { botId: { $exists: false } },
        { $set: { botId: defaultBot._id } }
      );
      console.log(`✅ ${sessionUpdate.modifiedCount} sessões vinculadas ao bot principal.`);
    }

    console.log('\n✨ Migração concluída com sucesso!');
  } catch (err) {
    console.error('\n❌ Erro durante a migração:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrate();
