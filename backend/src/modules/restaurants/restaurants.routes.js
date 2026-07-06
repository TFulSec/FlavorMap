const express    = require('express');
const controller = require('./restaurants.controller');
const auth       = require('../../middleware/auth');
const reviewsRouter = require('../reviews/reviews.routes');
const bookmarksController = require('../bookmarks/bookmarks.controller');
const router     = express.Router();

router.get('/',          controller.getRestaurants);     // ?type=featured&page=1
router.get('/search',    controller.searchRestaurants);  // ?q=phở&page=1
router.get('/filter',    controller.filterRestaurants);  // ?category=Cafe&priceMax=100000
router.get('/:slug',     controller.getRestaurantBySlug);

router.use('/:slug/reviews', reviewsRouter);
router.post('/:slug/bookmark', auth, bookmarksController.addBookmark);
router.delete('/:slug/bookmark', auth, bookmarksController.removeBookmark);

module.exports = router;
