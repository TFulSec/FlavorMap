const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/authorize');
const upload = require('../../middleware/upload');
const controller = require('./owner.controller');

const router = express.Router();

const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn thao tác quá thường xuyên.' },
});

const exportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn đã xuất báo cáo quá nhiều lần.' },
});

router.use(auth, authorize(['Owner', 'Admin']));

router.get('/restaurants', controller.getRestaurants);
router.get('/dashboard', controller.getDashboard);
router.get('/restaurants/:restaurantId', controller.getRestaurantDetails);
router.put('/restaurants/:restaurantId', writeLimiter, controller.updateRestaurantInfo);
router.put('/restaurants/:restaurantId/operations', writeLimiter, controller.updateOperations);

router.get('/restaurants/:restaurantId/opening-hours', controller.getOpeningHours);
router.put('/restaurants/:restaurantId/opening-hours', writeLimiter, controller.updateOpeningHours);

router.get('/restaurants/:restaurantId/menu-categories', controller.getMenuCategories);
router.post('/restaurants/:restaurantId/menu-categories', writeLimiter, controller.addMenuCategory);
router.put('/menu-categories/:categoryId', writeLimiter, controller.updateMenuCategory);
router.delete('/menu-categories/:categoryId', writeLimiter, controller.deleteMenuCategory);

router.get('/restaurants/:restaurantId/menu', controller.getMenu);
router.post('/restaurants/:restaurantId/menu', writeLimiter, controller.addMenuItem);
router.put('/menu/:menuItemId', writeLimiter, controller.updateMenuItem);
router.delete('/menu/:menuItemId', writeLimiter, controller.deleteMenuItem);

router.get('/restaurants/:restaurantId/reviews', controller.getReviews);
router.put('/reviews/:reviewId/reply', writeLimiter, controller.upsertReviewReply);
router.delete('/reviews/:reviewId/reply', writeLimiter, controller.deleteReviewReply);

router.put('/restaurants/:restaurantId/crowd-status', writeLimiter, controller.updateCrowdStatus);
router.post('/upload', writeLimiter, upload.single('file'), controller.uploadFile);
router.get('/reports/export', exportLimiter, controller.exportReport);

module.exports = router;
