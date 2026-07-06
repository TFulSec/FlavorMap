const express = require('express');
const auth    = require('../../middleware/auth');
const upload  = require('../../middleware/upload');
const controller = require('./submissions.controller');
const router  = express.Router();

router.post('/', auth, upload.single('image'), controller.createSubmission);

module.exports = router;
