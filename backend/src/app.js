const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');
require('dotenv').config();

const authRoutes        = require('./modules/auth/auth.routes');
const usersRoutes       = require('./modules/users/users.routes');
const restaurantsRoutes = require('./modules/restaurants/restaurants.routes');
const bookmarksRoutes   = require('./modules/bookmarks/bookmarks.routes');
const submissionsRoutes = require('./modules/submissions/submissions.routes');
const adminRoutes       = require('./modules/admin/admin.routes');
const errorHandler      = require('./middleware/errorHandler');
const { swaggerUi, specs } = require('./swagger');

const app = express();

app.set('trust proxy', 1); // Trust first proxy for express-rate-limit

app.use(helmet({
  contentSecurityPolicy: false // disabled for simpler local frontend serving
}));
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Static serve for frontend & uploads
app.use(express.static(path.join(process.cwd(), 'frontend')));
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use('/api/auth',        authRoutes);
app.use('/api/users',       usersRoutes);
app.use('/api/restaurants', restaurantsRoutes);
app.use('/api/bookmarks',   bookmarksRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/admin',       adminRoutes);

app.use(errorHandler);

// Route fallback for SPA if needed
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found: ' + req.path });
  }
  if (req.method === 'GET') {
    if (req.path === '/') {
      return res.redirect('/pages/index.html');
    }
    return res.sendFile(path.join(process.cwd(), 'frontend', 'pages', 'index.html'));
  }
  res.status(404).send('Not Found');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server chạy trên cổng ${PORT}`);
});