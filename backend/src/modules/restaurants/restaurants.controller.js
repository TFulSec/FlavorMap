const service = require('./restaurants.service');

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
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
