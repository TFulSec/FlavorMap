const Joi = require('joi');
const service = require('./restaurants.service');
const viewService = require('../restaurantViews/restaurantViews.service');

const crowdStatusSchema = Joi.object({
  crowdStatus: Joi.string().valid('quiet', 'moderate', 'crowded').required(),
});

exports.getRestaurants = async (req, res, next) => {
  try {
    const { type, page, limit, city } = req.query;
    const data = await service.getRestaurants({ type, page, limit, city });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.searchRestaurants = async (req, res, next) => {
  try {
    const { q, page, limit } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập từ khóa tìm kiếm.' });
    }
    const data = await service.searchRestaurants({ q: q.trim(), page, limit });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.filterRestaurants = async (req, res, next) => {
  try {
    const data = await service.filterRestaurants(req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getRestaurantBySlug = async (req, res, next) => {
  try {
    const data = await service.getRestaurantBySlug(req.params.slug);

    // The in-memory cache avoids most DB calls. The stored procedure is still
    // the authoritative 30-minute guard for restarts and multiple instances.
    try {
      await viewService.recordRestaurantView({
        restaurantId: data.Id,
        viewerHash: req.viewerHash,
      });
    } catch (trackingError) {
      // Analytics must never make the restaurant detail endpoint unavailable.
      console.error('View tracking failed:', trackingError.message);
    }

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateCrowdStatus = async (req, res, next) => {
  try {
    const { error, value } = crowdStatusSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((item) => item.message).join('; '),
      });
    }

    const data = await service.updateCrowdStatus({
      slug: req.params.slug,
      crowdStatus: value.crowdStatus,
      userId: req.user.id,
      role: req.user.role,
    });
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};
