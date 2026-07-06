const express     = require('express');
const rateLimit   = require('express-rate-limit');
const controller  = require('./auth.controller');
const router      = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  message: { success: false, message: 'Quá nhiều yêu cầu. Thử lại sau 15 phút.' },
});

router.post('/register', authLimiter, controller.register);
router.post('/login',    authLimiter, controller.login);
router.post('/logout',   controller.logout);
router.post('/refresh',  controller.refreshToken);

module.exports = router;
