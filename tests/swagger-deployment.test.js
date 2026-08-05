const assert = require('assert');
const http = require('http');

process.env.NODE_ENV = 'test';
process.env.FORCE_MOCK_DB = 'true';
process.env.CLIENT_URL = 'http://localhost:3000,https://tfulsec.site';

const app = require('../backend/src/app');

function request(server, pathname, options = {}) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: address.port,
      path: pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const server = app.listen(0);
  try {
    const redirect = await request(server, '/api-docs');
    assert.strictEqual(redirect.status, 308, 'GET /api-docs phải chuyển sang URL có dấu gạch chéo cuối');
    assert.strictEqual(redirect.headers.location, '/api-docs/');

    const page = await request(server, '/api-docs/');
    assert.strictEqual(page.status, 200, 'Swagger UI phải mở được');
    assert.match(page.body, /FlavorMap API Documentation|Swagger UI/i);
    assert.match(page.body, /swagger-ui-init\.js/i, 'Trang Swagger phải nạp file khởi tạo');

    // swagger-ui-express đặt swaggerOptions.url trong swagger-ui-init.js,
    // không nhúng trực tiếp ./openapi.json vào HTML index.
    const initScript = await request(server, '/api-docs/swagger-ui-init.js');
    assert.strictEqual(initScript.status, 200, 'File khởi tạo Swagger UI phải tải được');
    assert.match(
      initScript.body,
      /\.\/openapi\.json/,
      'Swagger UI phải đọc OpenAPI JSON bằng URL tương đối'
    );

    const jsonResponse = await request(server, '/api-docs/openapi.json');
    assert.strictEqual(jsonResponse.status, 200, 'OpenAPI JSON phải truy cập được');
    const spec = JSON.parse(jsonResponse.body);
    assert.strictEqual(spec.openapi, '3.0.0');
    assert.deepStrictEqual(spec.servers, [{ url: '/', description: 'Máy chủ hiện tại' }]);
    assert.ok(Object.keys(spec.paths || {}).length > 0, 'Swagger phải quét được các API paths');

    const corsResponse = await request(server, '/api-docs/openapi.json', {
      headers: { Origin: 'https://tfulsec.site' }
    });
    assert.strictEqual(corsResponse.status, 200);
    assert.strictEqual(corsResponse.headers['access-control-allow-origin'], 'https://tfulsec.site');

    console.log('✅ Swagger local/production regression tests passed.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
