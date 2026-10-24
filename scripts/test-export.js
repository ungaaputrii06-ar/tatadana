const http = require('http');

async function testExport(format, path) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      userId: 'usr_bunga_01',
      format: format
    });

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let dataLen = 0;
      res.on('data', chunk => { dataLen += chunk.length; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          contentType: res.headers['content-type'],
          contentDisposition: res.headers['content-disposition'],
          bytes: dataLen
        });
      });
    });

    req.on('error', (e) => resolve({ error: e.message }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('Testing Export Endpoints...');
  const pdfRes = await testExport('pdf', '/api/reports/export-pdf');
  console.log('PDF Export:', pdfRes);

  const excelRes = await testExport('excel', '/api/reports/export-excel');
  console.log('Excel Export:', excelRes);

  const csvRes = await testExport('csv', '/api/reports/export-csv');
  console.log('CSV Export:', csvRes);
}

run();
