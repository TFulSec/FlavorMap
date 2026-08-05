const Joi     = require('joi');
const service = require('./reviews.service');


const reportSchema = Joi.object({
  reason: Joi.string().valid('Spam', 'Offensive', 'FalseInformation', 'ConflictOfInterest', 'Other').required(),
  details: Joi.string().trim().max(500).allow('', null),
});

const reviewSchema = Joi.object({
  rating:  Joi.number().integer().min(1).max(5).required().messages({
    'any.required': 'Vui lòng chọn số sao đánh giá.',
    'number.min':   'Số sao phải từ 1 đến 5.',
  }),
  comment: Joi.string().max(1000).allow('', null),
});

exports.getReviews = async (req, res, next) => {
  try {
    const data = await service.getReviews(req.params.slug, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.upsertReview = async (req, res, next) => {
  try {
    // Handle mock if needed, but validation first
    const { error, value } = reviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false, message: error.details[0].message,
      });
    }
    await service.upsertReview(req.params.slug, req.user.id, value);
    res.json({ success: true, message: 'Cảm ơn bạn đã đánh giá!' });
  } catch (err) { next(err); }
};

exports.deleteReview = async (req, res, next) => {
  try {
    await service.deleteReview(req.params.slug, req.user.id);
    res.json({ success: true, message: 'Đã xoá đánh giá.' });
  } catch (err) { next(err); }
};

exports.reportReview = async (req, res, next) => {
  try {
    const { error, value } = reportSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const data = await service.reportReview({
      slug: req.params.slug,
      reviewId: req.params.reviewId,
      userId: req.user.id,
      reason: value.reason,
      details: value.details || null,
    });
    return res.status(201).json({
      success: true,
      message: 'Đã gửi báo cáo. Bộ phận quản trị sẽ xem xét nội dung này.',
      data,
    });
  } catch (err) { return next(err); }
};
