const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Dùng đường dẫn tuyệt đối để Swagger vẫn quét được YAML/JSDoc khi ứng dụng
// chạy qua IIS/httpPlatformHandler trên SmarterASP.NET với working directory khác local.
const toGlob = (...segments) => path.join(...segments).replace(/\\/g, '/');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FlavorMap API',
      version: '1.0.0',
      description: 'Thổ Địa Ẩm Thực API'
    },
    // URL tương đối giúp nút "Try it out" tự gọi đúng host hiện tại:
    // localhost khi chạy local và https://tfulsec.site khi triển khai production.
    servers: [
      {
        url: '/',
        description: 'Máy chủ hiện tại'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },

  apis: [
    toGlob(__dirname, 'modules', '**', '*.routes.js'),
    toGlob(__dirname, 'docs', '*.yaml')
  ]
};

const specs = swaggerJsdoc(options);

// Tệp YAML có thể tự khai báo servers. Ép lại URL tương đối sau khi merge để
// tránh Swagger production tiếp tục gọi http://localhost:3000 (mixed content).
specs.servers = [
  {
    url: '/',
    description: 'Máy chủ hiện tại'
  }
];

const swaggerSetupOptions = {
  customSiteTitle: 'FlavorMap API Documentation',
  customCss: '',
  explorer: true,
  swaggerOptions: {
    url: './openapi.json',
    persistAuthorization: true,
    displayRequestDuration: true,
    tryItOutEnabled: true
  }
};

module.exports = {
  swaggerUi,
  specs,
  swaggerSetupOptions
};
