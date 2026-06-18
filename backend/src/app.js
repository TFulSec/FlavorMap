const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const cors = require('cors');

const helmet  = require('helmet');
const morgan  = require('morgan');
require('dotenv').config();

const authRoutes        = require('./modules/auth/auth.routes');
const usersRoutes       = require('./modules/users/users.routes');
const restaurantsRoutes = require('./modules/restaurants/restaurants.routes');
const errorHandler      = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(helmet());

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health Check
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'FlavorMap Backend is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/restaurants', restaurantsRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 API Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} không tồn tại`
    });
});

// Error Handler
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});