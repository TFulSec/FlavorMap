const express    = require('express');
const auth       = require('../../middleware/auth');
const upload     = require('../../middleware/upload');
const controller = require('./users.controller');
const router     = express.Router();

router.get('/profile',          auth, controller.getProfile);
router.put('/profile',          auth, controller.updateProfile);
router.post('/profile/avatar',  auth, upload.single('avatar'), controller.uploadAvatar);
router.put('/change-password',  auth, controller.changePassword);

module.exports = router;
