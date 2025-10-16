const fetch = require('node-fetch');

const API = 'http://localhost:4000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXItMSIsInRlbmFudElkIjoidGVuYW50X2RlbW8iLCJyb2xlcyI6WyJhZG1pbiIsImFjY291bnRhbnQiXSwiaWF0IjoxNzU5MjI2Nzc3LCJleHAiOjE3NTkyMzAzNzd9.OeCdACMloqisd20DQcapKgAb782BG_DSuxqkDOEfyY8';
const headers = {
  Authorization: 'Bearer ' + TOKEN,
  'Content-Type': 'application/json',
  'x-tenant-id': 'tenant_demo',
  'x-company-id': 'cmg0qxjh9003nao3ftbaz1oc1',
};

(async () => {
  function log(t, d) {
    console.log(t, typeof d === 'string' ? d : JSON.stringify(d, null, 2));
  }
  try {
    log('🔒 Locking period', '2025-12');
    let res = await fetch(`${API}/period-close/cmg0qxjh9003nao3ftbaz1oc1/2025-12/lock`, {
      method: 'POST',
      headers,
    });
    log('Lock status', res.status + '');
    log('Lock body', await res.text());

    log('\n📝 Creating tx in closed period', '2025-12-10');
    res = await fetch(`${API}/transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        companyId: 'cmg0qxjh9003nao3ftbaz1oc1',
        transactionDate: '2025-12-10',
        amount: 1234.56,
        transactionType: 'income',
        currency: 'USD',
        status: 'completed',
        description: 'Test in closed period',
      }),
    });
    const body = await res.text();
    log('Create tx response code', res.status + '');
    log('Create tx response body', body);

    log('\n🔍 Verifying periods', '');
    res = await fetch(`${API}/period-close/cmg0qxjh9003nao3ftbaz1oc1/periods`, { headers });
    log('Periods', await res.text());
  } catch (e) {
    console.error('ERR', e.stack || e.message);
  }
})();
