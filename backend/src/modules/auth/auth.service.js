const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../../config/db');
const { getJwtSecret } = require('../../utils/jwt');

const SALT_ROUNDS = 12;

const register = async ({ fullName, email, password }) => {
  const pool = await getPool();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await pool.request()
    .input('Email', sql.NVarChar(150), normalizedEmail)
    .query('SELECT Id FROM dbo.Users WHERE Email = @Email');

  if (existing.recordset.length > 0) {
    const error = new Error('Email đã được sử dụng.');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await pool.request()
    .input('FullName', sql.NVarChar(100), fullName.trim())
    .input('Email', sql.NVarChar(150), normalizedEmail)
    .input('PasswordHash', sql.NVarChar(255), passwordHash)
    .input('Role', sql.NVarChar(20), 'User')
    .query(`
      INSERT INTO dbo.Users (FullName, Email, PasswordHash, Role)
      OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.Role, INSERTED.CreatedAt
      VALUES (@FullName, @Email, @PasswordHash, @Role);
    `);

  return result.recordset[0];
};

const login = async ({ email, password }) => {
  const pool = await getPool();
  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.request()
    .input('Email', sql.NVarChar(150), normalizedEmail)
    .query('SELECT * FROM dbo.Users WHERE Email = @Email');

  const user = result.recordset[0];
  if (!user) {
    const error = new Error('Email hoặc mật khẩu không đúng.');
    error.statusCode = 401;
    throw error;
  }
  if (Boolean(user.IsBanned)) {
    const error = new Error('Tài khoản đã bị khóa.');
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.PasswordHash);
  if (!isMatch) {
    const error = new Error('Email hoặc mật khẩu không đúng.');
    error.statusCode = 401;
    throw error;
  }

  const payload = {
    id: user.Id,
    email: user.Email,
    fullName: user.FullName,
    role: user.Role || 'User',
  };
  const secret = getJwtSecret();
  const accessToken = jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.request()
    .input('UserId', sql.UniqueIdentifier, user.Id)
    .input('Token', sql.NVarChar(sql.MAX), refreshToken)
    .input('ExpiresAt', sql.DateTime2(3), expiresAt)
    .query('INSERT INTO dbo.RefreshTokens (UserId, Token, ExpiresAt) VALUES (@UserId, @Token, @ExpiresAt)');

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.Id,
      fullName: user.FullName,
      email: user.Email,
      avatarUrl: user.AvatarUrl,
      role: user.Role || 'User',
    },
  };
};

const logout = async (refreshToken) => {
  const pool = await getPool();
  await pool.request()
    .input('Token', sql.NVarChar(sql.MAX), refreshToken)
    .query('DELETE FROM dbo.RefreshTokens WHERE Token = @Token');
};

const refreshAccessToken = async (refreshToken) => {
  const pool = await getPool();
  try {
    jwt.verify(refreshToken, getJwtSecret());
  } catch {
    const error = new Error('Refresh token không hợp lệ hoặc đã hết hạn.');
    error.statusCode = 401;
    throw error;
  }

  const result = await pool.request()
    .input('Token', sql.NVarChar(sql.MAX), refreshToken)
    .query(`
      SELECT rt.UserId, rt.ExpiresAt, u.FullName, u.Email, u.Role, u.IsBanned
      FROM dbo.RefreshTokens rt
      INNER JOIN dbo.Users u ON u.Id = rt.UserId
      WHERE rt.Token = @Token AND rt.ExpiresAt > SYSUTCDATETIME();
    `);

  const record = result.recordset[0];
  if (!record) {
    const error = new Error('Refresh token không hợp lệ hoặc đã hết hạn.');
    error.statusCode = 401;
    throw error;
  }
  if (Boolean(record.IsBanned)) {
    await logout(refreshToken);
    const error = new Error('Tài khoản đã bị khóa.');
    error.statusCode = 403;
    throw error;
  }

  const payload = {
    id: record.UserId,
    email: record.Email,
    fullName: record.FullName,
    role: record.Role || 'User',
  };
  const accessToken = jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || process.env.JWT_EXPIRES_IN || '15m',
  });
  return { accessToken };
};

module.exports = { register, login, logout, refreshAccessToken };
