const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../../middleware/auth');
const optionalAuth = require('../../middleware/optionalAuth');
const controller = require('./voteRooms.controller');

const router = express.Router();

const createRoomLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn đã tạo quá nhiều phòng. Vui lòng thử lại sau.' },
});

const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu bình chọn từ thiết bị này.' },
});

router.post('/', auth, createRoomLimiter, controller.createRoom);
router.get('/:code', optionalAuth, controller.getRoom);
router.post('/:code/vote', auth, voteLimiter, controller.vote);
router.patch('/:code/status', auth, controller.updateStatus);

module.exports = router;
