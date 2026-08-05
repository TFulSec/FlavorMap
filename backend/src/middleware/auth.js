const jwt = require('jsonwebtoken');
const { getPool, sql, getMockState } = require('../config/db');
const { getJwtSecret } = require('../utils/jwt');

const loadUserFromToken = async (token) => {
  const decoded = jwt.verify(token, getJwtSecret());
  const pool = await getPool();
  let user;

  if (pool.__isMock) {
    user = getMockState().users.find((item) => String(item.Id) === String(decoded.id));
  } else {
    const result = await pool.request()
      .input('Id', sql.UniqueIdentifier, decoded.id)
      .query('SELECT Id, Email, FullName, Role, IsBanned FROM dbo.Users WHERE Id = @Id');
    user = result.recordset?.[0];
  }

  if (!user) {
    const error = new Error('Tài khoản không còn tồn tại.');
    error.statusCode = 401;
    throw error;
  }
  if (Boolean(user.IsBanned)) {
    const error = new Error('Tài khoản đã bị khóa.');
    error.statusCode = 403;
    throw error;
  }

  return {
    id: user.Id,
    email: user.Email,
    fullName: user.FullName,
    role: user.Role || 'User',
  };
};

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const [scheme, token] = authHeader?.split(' ') || [];

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      message: 'Không tìm thấy Bearer token. Vui lòng đăng nhập.',
    });
  }

  try {
    req.user = await loadUserFromToken(token);
    return next();
  } catch (error) {
    const status = error.statusCode || 401;
    return res.status(status).json({
      success: false,
      message: error.statusCode ? error.message : 'Token không hợp lệ hoặc đã hết hạn.',
    });
  }
};

authMiddleware.loadUserFromToken = loadUserFromToken;
module.exports = authMiddleware;
