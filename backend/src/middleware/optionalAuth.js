const auth = require('./auth');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = null;
    return next();
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Authorization header không hợp lệ.' });
  }

  try {
    req.user = await auth.loadUserFromToken(token);
    return next();
  } catch (error) {
    return res.status(error.statusCode || 401).json({
      success: false,
      message: error.statusCode ? error.message : 'Token không hợp lệ hoặc đã hết hạn.',
    });
  }
};
