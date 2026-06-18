const express    = require('express');
const auth       = require('../../middleware/auth');
const controller = require('./users.controller');
const router     = express.Router();

router.get('/profile',          auth, controller.getProfile);
router.put('/profile',          auth, controller.updateProfile);
router.put('/change-password',  auth, controller.changePassword);

module.exports = router;
