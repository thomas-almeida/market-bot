const crypto = require('crypto');

function validateWebhook(req, secret) {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;

  console.log('--- Webhook Validation ---');
  console.log('Received Signature:', signature);
  console.log('Payload Type:', typeof payload);
  console.log('Secret Used (first 4 chars):', secret ? secret.substring(0, 4) : 'MISSING');

  if (!signature) {
    console.log('Validation Failed: No signature header');
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');

  console.log('Expected Signature:', expectedSignature);

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );

  console.log('Signature Match:', isValid);
  return isValid;
}

module.exports = { validateWebhook };
