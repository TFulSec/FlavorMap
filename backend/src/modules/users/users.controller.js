const service = require('./users.service');

exports.getProfile = async (req, res, next) => {
  try {
    const data = await service.getProfile(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, avatarUrl } = req.body;
    const data = await service.updateProfile(req.user.id, { fullName, phone, avatarUrl });
    res.json({ success: true, message: 'Cập nhật hồ sơ thành công.', data });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Xác nhận mật khẩu không khớp.' });
    }
    await service.changePassword(req.user.id, { currentPassword, newPassword });
    res.json({ success: true, message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (err) {
    next(err);
  }
};
