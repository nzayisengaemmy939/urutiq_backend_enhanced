import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function check(path: string) {
  try {
  const res = await fetch(`${API_URL}${path}`, {} as any);
    const text = await res.text();
    console.log(`[${path}] ${res.status}`);
    try {
      console.log(JSON.stringify(JSON.parse(text), null, 2));
    } catch (e) {
      console.log(text);
    }
  } catch (err) {
    console.error(`[${path}] request failed`, err.message || err);
  }
}

(async () => {
  console.log('Smoke test: Chart of Accounts endpoints');
  await check('/account-types');
  await check('/accounts');
  await check('/accounts/summary');
  console.log('Done');
})();
