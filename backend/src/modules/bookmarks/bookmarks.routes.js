const express = require('express');
const auth    = require('../../middleware/auth');
const controller = require('./bookmarks.controller');
const router  = express.Router();

router.get('/',    auth, controller.getBookmarks);
router.get('/ids', auth, controller.getBookmarkIds);

module.exports = router;
