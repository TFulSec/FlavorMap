const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  console.log('AUTH HEADER:', req.headers.authorization);

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  console.log('TOKEN:', token);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Không tìm thấy token. Vui lòng đăng nhập.'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_super_secret_key_here'
    );

    req.user = decoded;
    next();
  } catch (err) {
    console.log('JWT ERROR:', err.message);

    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn.'
    });
  }
};

module.exports = authMiddleware;