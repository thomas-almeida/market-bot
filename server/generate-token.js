require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const AdminToken = require('./src/models/AdminToken');
const connectDB = require('./src/config/db');

async function generate() {
  try {
    await connectDB();
    
    const email = 'contato.thomasalmeidard@gmail.com';
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 168); // 7 dias de validade

    // Remover tokens antigos do mesmo email para limpar
    await AdminToken.deleteMany({ email });
    
    await AdminToken.create({ email, token, expiresAt });

    console.log('\n--- TOKEN GERADO COM SUCESSO ---');
    console.log(`Email: ${email}`);
    console.log(`Token: ${token}`);
    console.log(`Expira em: ${expiresAt.toLocaleString()}`);
    console.log('--------------------------------\n');

  } catch (err) {
    console.error('Erro ao gerar token:', err);
  } finally {
    await mongoose.disconnect();
  }
}

generate();
