const express = require('express');
const auth    = require('../../middleware/auth');
const controller = require('./reviews.controller');
const router  = express.Router({ mergeParams: true });

router.get('/',    controller.getReviews);          // public
router.post('/:reviewId/report', auth, controller.reportReview);
router.post('/',   auth, controller.upsertReview);  // tạo/sửa (MERGE)
router.delete('/', auth, controller.deleteReview);

module.exports = router;
