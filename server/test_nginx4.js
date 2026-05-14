import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('https://dg-sandbox.setu.co//api/digilocker');
    console.log(res.data);
  } catch (err) {
    console.log(err.response?.status);
    console.log(err.response?.data);
  }
}

test();
