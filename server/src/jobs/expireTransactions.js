const cron = require('node-cron');
const Transaction = require('../models/Transaction');

function startExpireJobs() {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const result = await Transaction.updateMany(
        { status: 'PENDING', expiresAt: { $lt: now } },
        { $set: { status: 'EXPIRED' } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Expired ${result.modifiedCount} transactions`);
      }
    } catch (err) {
      console.error('ExpireJobs error:', err.message);
    }
  });
  console.log('ExpireJobs started (every 1 minute)');
}

module.exports = { startExpireJobs };
