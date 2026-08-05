const express = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/authorize');
const upload = require('../../middleware/upload');
const controller = require('./admin.controller');

const router = express.Router();
router.use(auth);

router.post('/upload', authorize(['Admin', 'Manager']), upload.single('file'), controller.uploadFile);

router.get('/restaurants/:restaurantId/menu', authorize(['Admin', 'Manager']), controller.getMenuByRestaurantId);
router.post('/restaurants/:restaurantId/menu', authorize(['Admin', 'Manager']), controller.addMenuItem);
router.put('/menu/:id', authorize(['Admin', 'Manager']), controller.updateMenuItem);
router.delete('/menu/:id', authorize(['Admin', 'Manager']), controller.deleteMenuItem);

router.get('/submissions', authorize(['Admin', 'Manager']), controller.getSubmissions);
router.put('/submissions/:id/status', authorize(['Admin', 'Manager']), controller.updateMissingRestaurantLeadStatus);

router.get('/users', authorize(['Admin', 'Manager']), controller.getUsers);
router.put('/users/:id/role', authorize(['Admin']), controller.updateUserRole);
router.put('/users/:id/ban', authorize(['Admin', 'Manager']), controller.banUser);

router.get('/reviews', authorize(['Admin', 'Manager']), controller.getReviewsForModeration);
router.put('/reviews/:id/moderation', authorize(['Admin']), controller.moderateReview);

router.get('/restaurants', authorize(['Admin', 'Manager']), controller.getRestaurants);
router.post('/restaurants', authorize(['Admin']), controller.directRestaurantCreationRetired);
router.put('/restaurants/:id', authorize(['Admin', 'Manager']), controller.updateRestaurant);
router.put('/restaurants/:id/owner', authorize(['Admin']), controller.assignRestaurantOwner);
router.put('/restaurants/:id/publication-status', authorize(['Admin']), controller.updateRestaurantPublicationStatus);
router.delete('/restaurants/:id', authorize(['Admin']), controller.hardDeleteRestaurantRetired);

module.exports = router;
