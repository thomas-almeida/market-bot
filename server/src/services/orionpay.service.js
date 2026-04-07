const axios = require('axios');

const GATEWAY_APIKEY = process.env.ORION_API_KEY;
const GATEWAY_BASEURL = process.env.ORION_BASEURL;

async function generatePixPayment({ amount, name, email }) {
  const response = await axios.post(`${GATEWAY_BASEURL}pix/generate`, {
    amount,
    name: name || 'Cliente PIX',
    email: email || 'telegramuser@gmail.com',
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': GATEWAY_APIKEY,
    },
  });

  return response.data;
}

module.exports = { generatePixPayment };
