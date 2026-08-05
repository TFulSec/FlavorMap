const Joi = require('joi');
const service = require('./owner.service');

const rangeSchema = Joi.object({
  from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const nullableUrl = Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(500).allow('', null);
const nullablePhone = Joi.string().trim().pattern(/^[0-9+()\-\s]{6,20}$/).allow('', null);

const restaurantSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().trim().max(5000).allow('', null),
  address: Joi.string().trim().min(3).max(300).required(),
  city: Joi.string().trim().min(2).max(100).required(),
  district: Joi.string().trim().max(100).allow('', null),
  category: Joi.string().valid('Cafe', 'Cơm', 'Đồ ăn vặt', 'Nước', 'Hải sản', 'Khác').required(),
  priceMin: Joi.number().integer().min(0).max(100000000).required(),
  priceMax: Joi.number().integer().min(Joi.ref('priceMin')).max(100000000).required(),
  openingTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).allow('', null),
  closingTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).allow('', null),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),
  bannerUrl: Joi.string().trim().max(500).allow('', null),
  phone: nullablePhone,
  websiteUrl: nullableUrl,
  facebookUrl: nullableUrl,
  zaloPhone: nullablePhone,
});

const operationSchema = Joi.object({
  isTemporarilyClosed: Joi.boolean().required(),
  temporaryCloseReason: Joi.string().trim().max(300).allow('', null),
  temporaryClosedUntilUtc: Joi.date().iso().allow('', null),
  operatingNote: Joi.string().trim().max(300).allow('', null),
}).custom((value, helpers) => {
  if (value.isTemporarilyClosed && !value.temporaryCloseReason) {
    return helpers.error('any.custom', { message: 'Vui lòng nhập lý do tạm đóng cửa.' });
  }
  return value;
});

const openingHoursSchema = Joi.object({
  hours: Joi.array().length(7).items(Joi.object({
    dayOfWeek: Joi.number().integer().min(0).max(6).required(),
    isClosed: Joi.boolean().required(),
    openingTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).allow('', null),
    closingTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).allow('', null),
  }).custom((value, helpers) => {
    if (!value.isClosed && (!value.openingTime || !value.closingTime)) {
      return helpers.error('any.custom', { message: 'Ngày mở cửa phải có giờ mở và đóng.' });
    }
    return value;
  })).required(),
});

const categorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  sortOrder: Joi.number().integer().min(0).max(10000).default(0),
});

const menuSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().trim().max(500).allow('', null),
  price: Joi.number().integer().min(0).max(100000000).required(),
  discountPrice: Joi.number().integer().min(0).max(100000000).allow(null),
  imageUrl: Joi.string().trim().max(500).allow('', null),
  isAvailable: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
  sortOrder: Joi.number().integer().min(0).max(10000).default(0),
  menuCategoryId: Joi.string().trim().max(100).allow('', null),
}).custom((value, helpers) => {
  if (value.discountPrice !== null && value.discountPrice !== undefined && value.discountPrice >= value.price) {
    return helpers.error('any.custom', { message: 'Giá khuyến mãi phải nhỏ hơn giá gốc.' });
  }
  return value;
});

const crowdSchema = Joi.object({
  crowdStatus: Joi.string().valid('quiet', 'moderate', 'crowded').required(),
});

const reviewQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  rating: Joi.number().integer().min(1).max(5).optional(),
});

const replySchema = Joi.object({
  content: Joi.string().trim().min(1).max(1000).required(),
});

const exportSchema = rangeSchema.keys({
  restaurantId: Joi.string().trim().max(100).optional(),
  format: Joi.string().valid('csv', 'xlsx', 'excel').default('csv'),
});

const validate = (schema, value) => {
  const result = schema.validate(value, { abortEarly: false, stripUnknown: true, convert: true });
  if (result.error) {
    const message = result.error.details
      .map((item) => item.context?.message || item.message)
      .join('; ');
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
  return result.value;
};

const principal = (req) => ({ userId: req.user.id, role: req.user.role });

exports.getRestaurants = async (req, res, next) => {
  try { res.json({ success: true, data: await service.getOwnedRestaurants(principal(req)) }); }
  catch (error) { next(error); }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const query = validate(rangeSchema, req.query);
    res.json({ success: true, data: await service.getDashboard({ ...principal(req), ...query }) });
  } catch (error) { next(error); }
};

exports.getRestaurantDetails = async (req, res, next) => {
  try {
    const data = await service.getRestaurantDetails({ ...principal(req), restaurantId: req.params.restaurantId });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.updateRestaurantInfo = async (req, res, next) => {
  try {
    const data = validate(restaurantSchema, req.body);
    const restaurant = await service.updateRestaurantInfo({ ...principal(req), restaurantId: req.params.restaurantId, data });
    res.json({ success: true, message: 'Đã cập nhật thông tin quán.', data: restaurant });
  } catch (error) { next(error); }
};

exports.updateOperations = async (req, res, next) => {
  try {
    const data = validate(operationSchema, req.body);
    const restaurant = await service.updateOperations({ ...principal(req), restaurantId: req.params.restaurantId, data });
    res.json({ success: true, message: 'Đã cập nhật trạng thái vận hành.', data: restaurant });
  } catch (error) { next(error); }
};

exports.getOpeningHours = async (req, res, next) => {
  try {
    const data = await service.getOpeningHours({ ...principal(req), restaurantId: req.params.restaurantId });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.updateOpeningHours = async (req, res, next) => {
  try {
    const { hours } = validate(openingHoursSchema, req.body);
    const data = await service.updateOpeningHours({ ...principal(req), restaurantId: req.params.restaurantId, hours });
    res.json({ success: true, message: 'Đã cập nhật lịch mở cửa.', data });
  } catch (error) { next(error); }
};

exports.getMenuCategories = async (req, res, next) => {
  try {
    const data = await service.getMenuCategories({ ...principal(req), restaurantId: req.params.restaurantId });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.addMenuCategory = async (req, res, next) => {
  try {
    const data = validate(categorySchema, req.body);
    const category = await service.addMenuCategory({ ...principal(req), restaurantId: req.params.restaurantId, data });
    res.status(201).json({ success: true, message: 'Đã thêm nhóm món.', data: category });
  } catch (error) { next(error); }
};

exports.updateMenuCategory = async (req, res, next) => {
  try {
    const data = validate(categorySchema, req.body);
    const category = await service.updateMenuCategory({ ...principal(req), categoryId: req.params.categoryId, data });
    res.json({ success: true, message: 'Đã cập nhật nhóm món.', data: category });
  } catch (error) { next(error); }
};

exports.deleteMenuCategory = async (req, res, next) => {
  try {
    await service.deleteMenuCategory({ ...principal(req), categoryId: req.params.categoryId });
    res.json({ success: true, message: 'Đã xóa nhóm món.' });
  } catch (error) { next(error); }
};

exports.getMenu = async (req, res, next) => {
  try {
    const data = await service.getMenu({ ...principal(req), restaurantId: req.params.restaurantId });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.addMenuItem = async (req, res, next) => {
  try {
    const data = validate(menuSchema, req.body);
    const item = await service.addMenuItem({ ...principal(req), restaurantId: req.params.restaurantId, data });
    res.status(201).json({ success: true, message: 'Đã thêm món ăn.', data: item });
  } catch (error) { next(error); }
};

exports.updateMenuItem = async (req, res, next) => {
  try {
    const data = validate(menuSchema, req.body);
    const item = await service.updateMenuItem({ ...principal(req), menuItemId: req.params.menuItemId, data });
    res.json({ success: true, message: 'Đã cập nhật món ăn.', data: item });
  } catch (error) { next(error); }
};

exports.deleteMenuItem = async (req, res, next) => {
  try {
    await service.deleteMenuItem({ ...principal(req), menuItemId: req.params.menuItemId });
    res.json({ success: true, message: 'Đã xóa món ăn.' });
  } catch (error) { next(error); }
};

exports.getReviews = async (req, res, next) => {
  try {
    const query = validate(reviewQuerySchema, req.query);
    const data = await service.getOwnerReviews({ ...principal(req), restaurantId: req.params.restaurantId, ...query });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.upsertReviewReply = async (req, res, next) => {
  try {
    const { content } = validate(replySchema, req.body);
    const data = await service.upsertReviewReply({ ...principal(req), reviewId: req.params.reviewId, content });
    res.json({ success: true, message: 'Đã lưu phản hồi của Chủ quán.', data });
  } catch (error) { next(error); }
};

exports.deleteReviewReply = async (req, res, next) => {
  try {
    await service.deleteReviewReply({ ...principal(req), reviewId: req.params.reviewId });
    res.json({ success: true, message: 'Đã xóa phản hồi.' });
  } catch (error) { next(error); }
};

exports.updateCrowdStatus = async (req, res, next) => {
  try {
    const data = validate(crowdSchema, req.body);
    const restaurant = await service.updateCrowdStatus({
      ...principal(req),
      restaurantId: req.params.restaurantId,
      crowdStatus: data.crowdStatus,
    });
    res.json({ success: true, message: 'Đã cập nhật trạng thái quán.', data: restaurant });
  } catch (error) { next(error); }
};

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Không có file tải lên.' });
    return res.json({ success: true, url: `/uploads/submissions/${req.file.filename}` });
  } catch (error) { return next(error); }
};

exports.exportReport = async (req, res, next) => {
  try {
    const query = validate(exportSchema, req.query);
    const { rows, range } = await service.getReportRows({ ...principal(req), ...query });

    if (query.format === 'xlsx' || query.format === 'excel') {
      const buffer = await service.buildXlsx(rows);
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="flavormap-owner-${range.from}-${range.to}.xlsx"`,
        'Cache-Control': 'no-store',
      });
      return res.send(Buffer.from(buffer));
    }

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="flavormap-owner-${range.from}-${range.to}.csv"`,
      'Cache-Control': 'no-store',
    });
    return res.send(service.buildCsv(rows));
  } catch (error) { return next(error); }
};
