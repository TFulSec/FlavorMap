const express = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/authorize');
const controller = require('./ownerApplications.controller');

const router = express.Router();
router.use(auth, authorize(['Admin', 'Manager']));

router.get('/', controller.adminList);
router.get('/:id', controller.adminGet);
router.put('/:id/start-review', controller.startReview);
router.put('/:id/request-changes', controller.requestChanges);
router.put('/:id/reject', controller.reject);
router.put('/:id/approve', authorize(['Admin']), controller.approve);

module.exports = router;
