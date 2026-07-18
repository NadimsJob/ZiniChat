const http = require('http');

const data = JSON.stringify({
  businessName: 'Test Business BD',
  name: 'Test Owner',
  email: 'test@business.com',
  password: 'password123'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${body}`);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
