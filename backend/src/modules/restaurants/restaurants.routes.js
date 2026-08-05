const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('./restaurants.controller');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/authorize');
const optionalAuth = require('../../middleware/optionalAuth');
const viewerIdentity = require('../../middleware/viewerIdentity');
const reviewsRouter = require('../reviews/reviews.routes');
const bookmarksController = require('../bookmarks/bookmarks.controller');
const router = express.Router();

const crowdStatusLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn cập nhật trạng thái quá thường xuyên.' },
});

router.get('/', controller.getRestaurants);     // ?type=featured&page=1
router.get('/search', controller.searchRestaurants);  // ?q=phở&page=1
router.get('/filter', controller.filterRestaurants);  // ?category=Cafe&priceMax=100000
router.put('/:slug/crowd-status', auth, authorize(['Owner', 'Admin']), crowdStatusLimiter, controller.updateCrowdStatus);
router.get('/:slug', optionalAuth, viewerIdentity, controller.getRestaurantBySlug);

router.use('/:slug/reviews', reviewsRouter);
router.post('/:slug/bookmark', auth, bookmarksController.addBookmark);
router.delete('/:slug/bookmark', auth, bookmarksController.removeBookmark);

module.exports = router;
