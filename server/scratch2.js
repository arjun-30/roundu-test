import axios from 'axios';

const SETU_BASE_URL = 'https://dg-sandbox.setu.co';
const HEADERS = {
  'x-client-id': '3b3d4e41-f540-4dfa-a44f-5fe3ea98a3f4',
  'x-client-secret': 'BizBetDlpEgM7DXWXAeWZTeUJtB7AilT',
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
