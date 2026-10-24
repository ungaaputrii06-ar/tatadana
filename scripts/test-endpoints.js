const http = require('http');

const endpoints = [
  '/',
  '/auth/login',
  '/dashboard',
  '/dashboard/transactions',
  '/dashboard/reports',
  '/dashboard/budgets',
  '/dashboard/wallets',
  '/dashboard/settings',
  '/dashboard/simulator',
  '/dashboard/tata-ai',
  '/dashboard/calendar'
];

async function checkEndpoint(path) {
  return new Promise((resolve) => {
    http.get('http://localhost:3000' + path, (res) => {
      resolve({ path, status: res.statusCode });
    }).on('error', (err) => {
      resolve({ path, error: err.message });
    });
  });
}

async function run() {
  console.log('Testing TataDana endpoints on http://localhost:3000 ...');
  for (const ep of endpoints) {
    const res = await checkEndpoint(ep);
    console.log(`${res.path.padEnd(26)} -> Status: ${res.status || 'ERROR: ' + res.error}`);
  }
}

run();
