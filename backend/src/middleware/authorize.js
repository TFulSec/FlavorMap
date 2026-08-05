module.exports = (roles = []) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập.',
    });
  }

  if (roles.length > 0 && !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thực hiện thao tác này.',
    });
  }

  return next();
};
