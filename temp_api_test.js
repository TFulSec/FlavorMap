const http = require("http");
const urls = [
  'http://localhost:3000/api/restaurants?type=featured&limit=8',
  'http://localhost:3000/api/restaurants?type=newest&limit=8'
];
let pending = urls.length;
urls.forEach(url => {
  http.get(url, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(url);
      console.log('status', res.statusCode);
      console.log(body.substring(0, 1000));
      console.log('---');
      if (--pending === 0) process.exit(0);
    });
  }).on('error', err => {
    console.error(url, 'error', err.message);
    if (--pending === 0) process.exit(1);
  });
});
