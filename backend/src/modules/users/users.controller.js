const service = require('./users.service');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await service.getProfile(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const updatedUser = await service.updateProfile(req.user.id, req.body);
    res.json({ success: true, message: 'Cập nhật thành công', data: updatedUser });
  } catch (err) {
    next(err);
  }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh.' });
    }
    const avatarUrl = `/uploads/submissions/${req.file.filename}`;
    const updatedUser = await service.updateProfile(req.user.id, { avatarUrl });
    res.json({ success: true, message: 'Cập nhật ảnh đại diện thành công', data: updatedUser });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    await service.changePassword(req.user.id, req.body);
    res.json({ success: true, message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (err) {
    next(err);
  }
};
