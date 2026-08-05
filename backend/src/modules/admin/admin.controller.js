const Joi = require('joi');
const service = require('./admin.service');

const roleSchema = Joi.object({ role: Joi.string().valid('User', 'Owner', 'Manager', 'Admin').required() });
const banSchema = Joi.object({ isBanned: Joi.boolean().required() });
const missingLeadStatusSchema = Joi.object({
  status: Joi.string().valid('UnderReview', 'Approved', 'Rejected').required(),
  note: Joi.string().trim().max(500).allow('', null),
});
const publicationSchema = Joi.object({
  publicationStatus: Joi.string().valid('Published', 'Hidden', 'Suspended').required(),
  note: Joi.string().trim().max(500).allow('', null),
});
const ownerSchema = Joi.object({ ownerUserId: Joi.string().trim().max(100).allow(null, '').required() });
const reviewModerationSchema = Joi.object({
  action: Joi.string().valid('Hide', 'Restore', 'DismissReports').required(),
  reason: Joi.string().trim().max(500).allow('', null),
});
const menuSchema = Joi.object({
  Name: Joi.string().trim().min(2).max(200).required(),
  Description: Joi.string().trim().max(500).allow('', null),
  Price: Joi.number().integer().min(0).max(100000000).required(),
  ImageUrl: Joi.string().trim().max(500).allow('', null),
  IsAvailable: Joi.boolean().default(true),
});

const validate = (schema, value) => {
  const result = schema.validate(value, { abortEarly: false, stripUnknown: true });
  if (result.error) {
    const error = new Error(result.error.details.map((item) => item.message).join('; '));
    error.statusCode = 400;
    throw error;
  }
  return result.value;
};

exports.getSubmissions = async (req, res, next) => {
  try { res.json({ success: true, data: await service.getSubmissions(req.query.status) }); }
  catch (error) { next(error); }
};

exports.updateMissingRestaurantLeadStatus = async (req, res, next) => {
  try {
    const body = validate(missingLeadStatusSchema, req.body);
    const data = await service.updateMissingRestaurantLeadStatus({
      id: req.params.id,
      status: body.status,
      note: body.note || null,
      reviewerId: req.user.id,
    });
    return res.json({
      success: true,
      message: body.status === 'Approved'
        ? 'Đã xác nhận đầu mối. Thông tin này không tự động tạo hoặc công khai quán.'
        : body.status === 'Rejected' ? 'Đã từ chối thông tin và lưu lý do.' : 'Đã bắt đầu kiểm tra thông tin.',
      data,
    });
  } catch (error) { return next(error); }
};

exports.directRestaurantCreationRetired = async (req, res) => res.status(410).json({
  success: false,
  message: 'Không tạo quán công khai trực tiếp. Chủ quán phải gửi hồ sơ xác minh và Admin phê duyệt tại trang Xét duyệt Chủ quán.',
});

exports.directOwnerAssignmentRetired = async (req, res) => res.status(410).json({
  success: false,
  message: 'Không gán Chủ quán thủ công. Hãy phê duyệt hồ sơ đăng ký quán hoặc yêu cầu nhận quyền quản lý.',
});

exports.hardDeleteRestaurantRetired = async (req, res) => res.status(410).json({
  success: false,
  message: 'Không xóa cứng quán. Hãy chuyển quán sang trạng thái Ẩn hoặc Đình chỉ để bảo toàn lịch sử dữ liệu.',
});

exports.getUsers = async (req, res, next) => {
  try { res.json({ success: true, data: await service.getUsers() }); }
  catch (error) { next(error); }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = validate(roleSchema, req.body);
    await service.updateUserRole({ id: req.params.id, role, requesterId: req.user.id });
    res.json({ success: true, message: 'Đã cập nhật vai trò.' });
  } catch (error) { next(error); }
};

exports.banUser = async (req, res, next) => {
  try {
    const { isBanned } = validate(banSchema, req.body);
    await service.banUser({
      id: req.params.id,
      isBanned,
      requesterId: req.user.id,
      requesterRole: req.user.role,
    });
    res.json({ success: true, message: isBanned ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.' });
  } catch (error) { next(error); }
};

exports.getRestaurants = async (req, res, next) => {
  try { res.json({ success: true, data: await service.getRestaurants() }); }
  catch (error) { next(error); }
};

exports.createRestaurant = async (req, res, next) => {
  try {
    const data = await service.createRestaurant(req.body, req.user.role);
    res.status(201).json({ success: true, message: 'Đã tạo quán ăn.', data });
  } catch (error) { next(error); }
};

exports.updateRestaurant = async (req, res, next) => {
  try {
    const data = await service.updateRestaurant(req.params.id, req.body, req.user.role);
    res.json({ success: true, message: 'Đã cập nhật quán.', data });
  } catch (error) { next(error); }
};

exports.assignRestaurantOwner = async (req, res, next) => {
  try {
    const { ownerUserId } = validate(ownerSchema, req.body);
    const data = await service.assignRestaurantOwner(req.params.id, ownerUserId);
    res.json({ success: true, message: 'Đã cập nhật Chủ quán.', data });
  } catch (error) { next(error); }
};

exports.updateRestaurantPublicationStatus = async (req, res, next) => {
  try {
    const body = validate(publicationSchema, req.body);
    const data = await service.updateRestaurantPublicationStatus({
      id: req.params.id,
      publicationStatus: body.publicationStatus,
      note: body.note || null,
      reviewerId: req.user.id,
    });
    res.json({ success: true, message: 'Đã cập nhật trạng thái công khai của quán.', data });
  } catch (error) { next(error); }
};

exports.deleteRestaurant = async (req, res, next) => {
  try {
    await service.deleteRestaurant(req.params.id);
    res.json({ success: true, message: 'Đã xóa quán ăn.' });
  } catch (error) { next(error); }
};

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Không có file tải lên.' });
    return res.json({ success: true, url: `/uploads/submissions/${req.file.filename}` });
  } catch (error) { return next(error); }
};

exports.getMenuByRestaurantId = async (req, res, next) => {
  try { res.json({ success: true, data: await service.getMenuByRestaurantId(req.params.restaurantId) }); }
  catch (error) { next(error); }
};

exports.addMenuItem = async (req, res, next) => {
  try {
    const body = validate(menuSchema, req.body);
    const data = await service.addMenuItem(req.params.restaurantId, body);
    res.status(201).json({ success: true, message: 'Đã thêm món ăn.', data });
  } catch (error) { next(error); }
};

exports.updateMenuItem = async (req, res, next) => {
  try {
    const body = validate(menuSchema, req.body);
    const data = await service.updateMenuItem(req.params.id, body);
    res.json({ success: true, message: 'Đã cập nhật món ăn.', data });
  } catch (error) { next(error); }
};

exports.deleteMenuItem = async (req, res, next) => {
  try {
    await service.deleteMenuItem(req.params.id);
    res.json({ success: true, message: 'Đã xóa món ăn.' });
  } catch (error) { next(error); }
};

exports.getReviewsForModeration = async (req, res, next) => {
  try {
    const data = await service.getReviewsForModeration({
      status: req.query.status || 'Reported',
      q: req.query.q || '',
    });
    return res.json({ success: true, data });
  } catch (error) { return next(error); }
};

exports.moderateReview = async (req, res, next) => {
  try {
    const body = validate(reviewModerationSchema, req.body);
    const data = await service.moderateReview({
      id: req.params.id,
      action: body.action,
      reason: body.reason || null,
      reviewerId: req.user.id,
    });
    const messages = {
      Hide: 'Đã ẩn đánh giá vi phạm và cập nhật lại điểm quán.',
      Restore: 'Đã khôi phục đánh giá.',
      DismissReports: 'Đã bác báo cáo; đánh giá vẫn được giữ nguyên.',
    };
    return res.json({ success: true, message: messages[body.action], data });
  } catch (error) { return next(error); }
};
