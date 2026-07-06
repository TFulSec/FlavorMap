const service = require('./admin.service');

exports.getSubmissions = async (req, res, next) => {
  try {
    const data = await service.getSubmissions(req.query.status);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateSubmissionStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    await service.updateSubmissionStatus(req.params.id, status);
    res.json({ success: true, message: 'Đã cập nhật trạng thái' });
  } catch (err) { next(err); }
};

exports.getUsers = async (req, res, next) => {
  try {
    const data = await service.getUsers();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    await service.updateUserRole(req.params.id, role);
    res.json({ success: true, message: 'Đã cập nhật vai trò' });
  } catch (err) { next(err); }
};

exports.banUser = async (req, res, next) => {
  try {
    const { isBanned } = req.body;
    await service.banUser(req.params.id, isBanned);
    res.json({ success: true, message: isBanned ? 'Đã cấm người dùng' : 'Đã gỡ cấm người dùng' });
  } catch (err) { next(err); }
};

exports.getRestaurants = async (req, res, next) => {
  try {
    const data = await service.getRestaurants();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createRestaurant = async (req, res, next) => {
  try {
    const data = await service.createRestaurant(req.body);
    res.status(211 || 201).json({ success: true, message: 'Đã tạo quán ăn mới thành công', data });
  } catch (err) { next(err); }
};

exports.updateRestaurant = async (req, res, next) => {
  try {
    await service.updateRestaurant(req.params.id, req.body);
    res.json({ success: true, message: 'Đã cập nhật quán' });
  } catch (err) { next(err); }
};

exports.deleteRestaurant = async (req, res, next) => {
  try {
    await service.deleteRestaurant(req.params.id);
    res.json({ success: true, message: 'Đã xóa quán ăn thành công' });
  } catch (err) { next(err); }
};

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không có file tải lên' });
    }
    const url = `/uploads/submissions/${req.file.filename}`;
    res.json({ success: true, url });
  } catch (err) { next(err); }
};

exports.getMenuByRestaurantId = async (req, res, next) => {
  try {
    const data = await service.getMenuByRestaurantId(req.params.restaurantId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.addMenuItem = async (req, res, next) => {
  try {
    const data = await service.addMenuItem(req.params.restaurantId, req.body);
    res.status(201).json({ success: true, message: 'Đã thêm món ăn mới', data });
  } catch (err) { next(err); }
};

exports.updateMenuItem = async (req, res, next) => {
  try {
    await service.updateMenuItem(req.params.id, req.body);
    res.json({ success: true, message: 'Đã cập nhật món ăn' });
  } catch (err) { next(err); }
};

exports.deleteMenuItem = async (req, res, next) => {
  try {
    await service.deleteMenuItem(req.params.id);
    res.json({ success: true, message: 'Đã xóa món ăn thành công' });
  } catch (err) { next(err); }
};
