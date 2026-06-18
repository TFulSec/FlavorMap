const service = require('./restaurants.service');

exports.getRestaurants = async (req, res, next) => {
  try {
    const result = await service.getRestaurants(req.query);

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });

  } catch (err) {
    next(err);
  }
};

exports.searchRestaurants = async (req, res, next) => {
  try {
    const { q, page, limit } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập từ khóa tìm kiếm.',
      });
    }

    const result = await service.searchRestaurants({
      q: q.trim(),
      page,
      limit,
    });

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });

  } catch (err) {
    next(err);
  }
};

exports.filterRestaurants = async (req, res, next) => {
  try {
    const result = await service.filterRestaurants(req.query);

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });

  } catch (err) {
    next(err);
  }
};

exports.getRestaurantBySlug = async (req, res, next) => {
  try {
    const restaurant = await service.getRestaurantBySlug(req.params.slug);

    res.json({
      success: true,
      data: restaurant,
    });

  } catch (err) {
    next(err);
  }
};