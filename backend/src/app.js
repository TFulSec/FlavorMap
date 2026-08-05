const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const restaurantsRoutes = require('./modules/restaurants/restaurants.routes');
const bookmarksRoutes = require('./modules/bookmarks/bookmarks.routes');
const submissionsRoutes = require('./modules/submissions/submissions.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const voteRoomsRoutes = require('./modules/voteRooms/voteRooms.routes');
const ownerRoutes = require('./modules/owner/owner.routes');
const ownerApplicationsRoutes = require('./modules/ownerApplications/ownerApplications.routes');
const ownerApplicationsAdminRoutes = require('./modules/ownerApplications/ownerApplications.admin.routes');
const { startViewRollupJob } = require('./modules/restaurantViews/restaurantViews.service');
const errorHandler = require('./middleware/errorHandler');
const { swaggerUi, specs, swaggerSetupOptions } = require('./swagger');

const app = express();
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) app.set('trust proxy', Number.isNaN(Number(trustProxy)) ? trustProxy : Number(trustProxy));

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((item) => item.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const allowAllOrigins = allowedOrigins.includes('*');

const isAllowedDevelopmentOrigin = (origin) => {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
};

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https://nominatim.openstreetmap.org'],
      fontSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));
app.use(cors({
  origin(origin, callback) {
    const normalizedOrigin = origin?.replace(/\/+$/, '');
    if (!origin || allowAllOrigins || allowedOrigins.includes(normalizedOrigin) || isAllowedDevelopmentOrigin(normalizedOrigin)) {
      return callback(null, true);
    }
    const error = new Error(`Origin không được CORS cho phép: ${origin}`);
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(express.static(path.join(process.cwd(), 'frontend')));
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));
// Chỉ chuyển đúng URL /api-docs sang /api-docs/.
// Dùng RegExp khớp tuyệt đối vì Express mặc định coi dấu / cuối là tùy chọn;
// nếu dùng app.get('/api-docs', ...) thì /api-docs/ cũng bị bắt và tự redirect
// về chính nó, tạo vòng lặp 308.
app.get(/^\/api-docs$/, (req, res) => res.redirect(308, '/api-docs/'));

// Cung cấp OpenAPI JSON riêng. Swagger UI đọc URL tương đối này nên hoạt động
// giống nhau trên localhost, tên miền tạm và https://tfulsec.site.
app.get('/api-docs/openapi.json', (req, res) => {
  res.set('Cache-Control', 'no-store');
  return res.json(specs);
});

// Khi Swagger UI nạp đặc tả từ một URL riêng, dùng serveFiles với cùng options
// để swagger-ui-init.js nhận đúng cấu hình trên localhost và production.
app.use(
  '/api-docs/',
  swaggerUi.serveFiles(null, swaggerSetupOptions),
  swaggerUi.setup(null, swaggerSetupOptions)
);

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/restaurants', restaurantsRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/admin/restaurant-applications', ownerApplicationsAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vote-rooms', voteRoomsRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/owner-applications', ownerApplicationsRoutes);

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: `API route not found: ${req.path}` });
  }
  if (req.method === 'GET') {
    if (req.path === '/') return res.redirect('/pages/index.html');
    return res.status(404).sendFile(path.join(process.cwd(), 'frontend', 'pages', 'index.html'));
  }
  return res.status(404).send('Not Found');
});

app.use(errorHandler);

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`🚀 Server chạy tại http://localhost:${port}`);
    startViewRollupJob();
  });
}

module.exports = app;
