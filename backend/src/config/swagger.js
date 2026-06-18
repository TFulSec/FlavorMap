const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',

    info: {
      title: 'FlavorMap API',
      version: '1.0.0',
      description: 'API documentation for FlavorMap Backend',
    },

    servers: [
      {
        url: 'http://localhost:5000',
      },
    ],

    // 🔐 THÊM JWT AUTH SUPPORT
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },

    // 🔐 Default security (có thể override từng route)
    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  // Scan toàn bộ routes có swagger comment
  apis: ['./src/modules/**/*.js'],
};

module.exports = swaggerJsdoc(options);