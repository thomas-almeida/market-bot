const crypto = require('crypto');

function validateWebhook(req, secret) {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;

  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

module.exports = { validateWebhook };
