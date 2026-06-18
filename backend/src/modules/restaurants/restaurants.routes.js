const express = require('express');
const controller = require('./restaurants.controller');

const router = express.Router();

/**
 * @swagger
 * /api/restaurants:
 *   get:
 *     summary: Lấy danh sách nhà hàng
 *     tags:
 *       - Restaurants
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [featured, newest]
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', controller.getRestaurants);

/**
 * @swagger
 * /api/restaurants/search:
 *   get:
 *     summary: Tìm kiếm nhà hàng
 *     tags:
 *       - Restaurants
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/search', controller.searchRestaurants);

/**
 * @swagger
 * /api/restaurants/filter:
 *   get:
 *     summary: Lọc nhà hàng
 *     tags:
 *       - Restaurants
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: priceMin
 *         schema:
 *           type: integer
 *       - in: query
 *         name: priceMax
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/filter', controller.filterRestaurants);

/**
 * @swagger
 * /api/restaurants/{slug}:
 *   get:
 *     summary: Lấy chi tiết nhà hàng
 *     tags:
 *       - Restaurants
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy nhà hàng
 */
router.get('/:slug', controller.getRestaurantBySlug);

module.exports = router;