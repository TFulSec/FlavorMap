const Joi     = require('joi');
const service = require('./submissions.service');

const schema = Joi.object({
  name:    Joi.string().min(3).max(200).required().messages({
    'any.required': 'Vui lòng nhập tên quán ăn.',
  }),
  address: Joi.string().min(5).required().messages({
    'any.required': 'Vui lòng nhập địa chỉ.',
  }),
  district: Joi.string().allow('', null),
  city:     Joi.string().allow('', null),
  category: Joi.string().allow('', null),
  description: Joi.string().allow('', null),
  suggestedPriceMin: Joi.number().min(0).empty('').allow(null),
  suggestedPriceMax: Joi.number().min(0).empty('').allow(null),
  latitude:  Joi.number().empty('').allow(null),
  longitude: Joi.number().empty('').allow(null),
});

exports.createSubmission = async (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const data = await service.createSubmission(req.user.id, value, req.file);
    res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn! Đề xuất đang được xem xét.',
      data: data || { Id: 'mock-' + Date.now(), Status: 'Pending' }, // mock fallback
    });
  } catch (err) { next(err); }
};
