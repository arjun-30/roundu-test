import axios from 'axios';

const SETU_BASE_URL = 'https://dg-sandbox.setu.co';
const HEADERS = {
  'x-client-id': 'prod-client-id-here',
  'x-client-secret': 'prod-client-secret-here',
  'content-type': 'application/json'
};
const PRODUCT_ID_DIGILOCKER = '534e1d22-6bcd-4d70-b1f2-867223426bc3';

async function test() {
  try {
    const res = await axios.post(
      `${SETU_BASE_URL}/api/digilocker`,
      { redirectUrl: 'https://random-url-xyz.com/foo/bar' },
      {
        headers: {
          ...HEADERS,
          'x-product-instance-id': PRODUCT_ID_DIGILOCKER
        }
      }
    );
    console.log("SUCCESS:", res.data);
  } catch (err) {
    console.error("ERROR:", err.response?.data || err.message);
  }
}

test();
