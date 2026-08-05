const Joi = require('joi');
const service = require('./ownerApplications.service');

const applicationSchema = Joi.object({
  submissionType: Joi.string().valid('OwnerCreate', 'OwnerClaim').default('OwnerCreate'),
  claimedRestaurantId: Joi.when('submissionType', {
    is: 'OwnerClaim',
    then: Joi.string().trim().max(100).required(),
    otherwise: Joi.string().trim().max(100).allow('', null),
  }),
  name: Joi.string().trim().min(3).max(200).required(),
  address: Joi.string().trim().min(5).max(300).required(),
  district: Joi.string().trim().max(100).allow('', null),
  city: Joi.string().trim().max(100).default('Hà Nội'),
  category: Joi.string().valid('Cafe', 'Cơm', 'Đồ ăn vặt', 'Nước', 'Hải sản', 'Khác').required(),
  description: Joi.string().trim().max(3000).allow('', null),
  suggestedPriceMin: Joi.number().integer().min(0).max(100000000).allow('', null),
  suggestedPriceMax: Joi.number().integer().min(0).max(100000000).allow('', null),
  latitude: Joi.number().min(-90).max(90).allow('', null),
  longitude: Joi.number().min(-180).max(180).allow('', null),
  ownerPhone: Joi.string().trim().min(8).max(30).required(),
  ownerEmail: Joi.string().trim().email().max(200).required(),
  ownerRelationship: Joi.string().valid('Chủ sở hữu', 'Người được ủy quyền', 'Quản lý quán').required(),
  storePhone: Joi.string().trim().max(30).allow('', null),
  websiteUrl: Joi.string().trim().uri().max(500).allow('', null),
  facebookUrl: Joi.string().trim().uri().max(500).allow('', null),
  zaloPhone: Joi.string().trim().max(30).allow('', null),
  openingTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
  closingTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
  submitNow: Joi.boolean().truthy('true').falsy('false').default(false),
});

const checklistSchema = Joi.object({
  ownerIdentity: Joi.boolean().required(),
  restaurantExists: Joi.boolean().required(),
  addressMatches: Joi.boolean().required(),
  noDuplicate: Joi.boolean().required(),
  contentComplete: Joi.boolean().required(),
  evidenceComplete: Joi.boolean().required(),
}).required();

const validate = (schema, value) => {
  const result = schema.validate(value, { abortEarly: false, stripUnknown: true, convert: true });
  if (result.error) {
    const error = new Error(result.error.details.map((item) => item.message).join('; '));
    error.statusCode = 400;
    throw error;
  }
  return result.value;
};

exports.create = async (req, res, next) => {
  try {
    const body = validate(applicationSchema, req.body);
    const requiredFiles = ['storefrontImage', 'menuProof', 'businessProof'];
    const missingFiles = requiredFiles.filter((field) => !req.files?.[field]?.length);
    if (body.submitNow && missingFiles.length) {
      return res.status(400).json({
        success: false,
        message: `Hồ sơ gửi duyệt còn thiếu bằng chứng: ${missingFiles.join(', ')}.`,
      });
    }
    const data = await service.createApplication({
      userId: req.user.id,
      body,
      files: req.files,
      submitNow: body.submitNow,
    });
    return res.status(201).json({
      success: true,
      message: body.submitNow ? 'Đã gửi hồ sơ để Admin xét duyệt.' : 'Đã lưu hồ sơ nháp.',
      data,
    });
  } catch (error) { return next(error); }
};


exports.update = async (req, res, next) => {
  try {
    const body = validate(applicationSchema, req.body);
    const data = await service.updateApplication({
      id: req.params.id,
      userId: req.user.id,
      body,
      files: req.files,
      submitNow: body.submitNow,
    });
    return res.json({
      success: true,
      message: body.submitNow ? 'Đã cập nhật và gửi lại hồ sơ.' : 'Đã cập nhật hồ sơ.',
      data,
    });
  } catch (error) { return next(error); }
};

exports.listMine = async (req, res, next) => {
  try { return res.json({ success: true, data: await service.listMine(req.user.id) }); }
  catch (error) { return next(error); }
};

exports.getMine = async (req, res, next) => {
  try {
    const data = await service.getApplicationForUser({ id: req.params.id, userId: req.user.id });
    return res.json({ success: true, data });
  } catch (error) { return next(error); }
};

exports.submit = async (req, res, next) => {
  try {
    const data = await service.submitApplication({ id: req.params.id, userId: req.user.id });
    return res.json({ success: true, message: 'Đã gửi lại hồ sơ để xét duyệt.', data });
  } catch (error) { return next(error); }
};

exports.adminList = async (req, res, next) => {
  try { return res.json({ success: true, data: await service.listForAdmin(req.query.status) }); }
  catch (error) { return next(error); }
};

exports.adminGet = async (req, res, next) => {
  try { return res.json({ success: true, data: await service.getForAdmin(req.params.id) }); }
  catch (error) { return next(error); }
};

exports.startReview = async (req, res, next) => {
  try {
    const data = await service.startReview({ id: req.params.id, reviewerId: req.user.id });
    return res.json({ success: true, message: 'Đã chuyển hồ sơ sang trạng thái đang kiểm tra.', data });
  } catch (error) { return next(error); }
};

exports.requestChanges = async (req, res, next) => {
  try {
    const payload = validate(Joi.object({ note: Joi.string().trim().min(10).max(3000).required(), checklist: checklistSchema }), req.body);
    const data = await service.requestChanges({
      id: req.params.id, reviewerId: req.user.id, note: payload.note, checklist: payload.checklist,
    });
    return res.json({ success: true, message: 'Đã yêu cầu Chủ quán bổ sung hồ sơ.', data });
  } catch (error) { return next(error); }
};

exports.reject = async (req, res, next) => {
  try {
    const payload = validate(Joi.object({ reason: Joi.string().trim().min(5).max(500).required(), checklist: checklistSchema }), req.body);
    const data = await service.rejectApplication({
      id: req.params.id, reviewerId: req.user.id, reason: payload.reason, checklist: payload.checklist,
    });
    return res.json({ success: true, message: 'Đã từ chối hồ sơ và lưu lý do.', data });
  } catch (error) { return next(error); }
};

exports.approve = async (req, res, next) => {
  try {
    const payload = validate(Joi.object({ checklist: checklistSchema }), req.body);
    const data = await service.approveApplication({
      id: req.params.id, reviewerId: req.user.id, checklist: payload.checklist,
    });
    return res.json({ success: true, message: 'Đã xác minh, xuất bản quán và cấp quyền Chủ quán.', data });
  } catch (error) { return next(error); }
};
