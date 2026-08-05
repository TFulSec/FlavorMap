const Joi = require('joi');
const service = require('./submissions.service');

/*
 * Legacy public submission endpoint is retained only as a "missing restaurant lead".
 * It never creates or publishes a restaurant. Owner applications use /api/owner-applications.
 */
const schema = Joi.object({
  name: Joi.string().trim().min(3).max(200).required().messages({
    'any.required': 'Vui lòng nhập tên quán ăn.',
  }),
  address: Joi.string().trim().min(5).max(300).required().messages({
    'any.required': 'Vui lòng nhập địa chỉ.',
  }),
  district: Joi.string().trim().max(100).allow('', null),
  city: Joi.string().trim().max(100).allow('', null),
  category: Joi.string().trim().max(50).allow('', null),
  description: Joi.string().trim().max(1500).allow('', null),
  suggestedPriceMin: Joi.number().integer().min(0).max(100000000).empty('').allow(null),
  suggestedPriceMax: Joi.number().integer().min(0).max(100000000).empty('').allow(null),
  latitude: Joi.number().min(-90).max(90).empty('').allow(null),
  longitude: Joi.number().min(-180).max(180).empty('').allow(null),
});

exports.createSubmission = async (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((item) => item.message).join('; '),
      });
    }

    const data = await service.createMissingRestaurantLead(req.user.id, value, req.file);
    return res.status(201).json({
      success: true,
      message: 'Đã ghi nhận thông tin quán chưa có. Đây chỉ là dữ liệu tham khảo và sẽ không tự động xuất hiện công khai.',
      data,
    });
  } catch (err) {
    return next(err);
  }
};
