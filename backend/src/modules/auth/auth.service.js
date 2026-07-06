const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { getPool, sql } = require('../../config/db');

const SALT_ROUNDS = 12;

// -------- REGISTER --------
const register = async ({ fullName, email, password }) => {
  const pool = await getPool();

  // Kiểm tra email trùng
  const existing = await pool.request()
    .input('Email', sql.NVarChar, email)
    .query('SELECT Id FROM Users WHERE Email = @Email');

  if (existing.recordset.length > 0) {
    const err = new Error('Email đã được sử dụng.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const role = email === 'accminh22@gmail.com' ? 'Admin' : 'User';

  const result = await pool.request()
    .input('FullName',     sql.NVarChar, fullName)
    .input('Email',        sql.NVarChar, email)
    .input('PasswordHash', sql.NVarChar, passwordHash)
    .input('Role',         sql.NVarChar, role)
    .query(`
      INSERT INTO Users (FullName, Email, PasswordHash, Role)
      OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.Role, INSERTED.CreatedAt
      VALUES (@FullName, @Email, @PasswordHash, @Role)
    `);

  return result.recordset[0];
};

// -------- LOGIN --------
const login = async ({ email, password }) => {
  const pool = await getPool();

  const result = await pool.request()
    .input('Email', sql.NVarChar, email)
    .query('SELECT * FROM Users WHERE Email = @Email');

  const user = result.recordset[0];
  if (!user) {
    const err = new Error('Email hoặc mật khẩu không đúng.');
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.PasswordHash);
  if (!isMatch) {
    const err = new Error('Email hoặc mật khẩu không đúng.');
    err.statusCode = 401;
    throw err;
  }

  const payload = { id: user.Id, email: user.Email, fullName: user.FullName, role: user.Role || 'User' };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'your_super_secret_key_here', {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET || 'your_super_secret_key_here', {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });

  // Lưu refresh token vào DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await pool.request()
    .input('UserId',    sql.UniqueIdentifier, user.Id)
    .input('Token',     sql.NVarChar(sql.MAX), refreshToken)
    .input('ExpiresAt', sql.DateTime2, expiresAt)
    .query('INSERT INTO RefreshTokens (UserId, Token, ExpiresAt) VALUES (@UserId, @Token, @ExpiresAt)');

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.Id,
      fullName: user.FullName,
      email: user.Email,
      avatarUrl: user.AvatarUrl,
      role: user.Role || 'User'
    },
  };
};

// -------- LOGOUT --------
const logout = async (refreshToken) => {
  const pool = await getPool();
  await pool.request()
    .input('Token', sql.NVarChar(sql.MAX), refreshToken)
    .query('DELETE FROM RefreshTokens WHERE Token = @Token');
};

// -------- REFRESH TOKEN --------
const refreshAccessToken = async (refreshToken) => {
  const pool = await getPool();

  const result = await pool.request()
    .input('Token', sql.NVarChar(sql.MAX), refreshToken)
    .query(`
      SELECT rt.*, u.FullName, u.Email, u.Role
      FROM RefreshTokens rt
      JOIN Users u ON u.Id = rt.UserId
      WHERE rt.Token = @Token AND rt.ExpiresAt > GETDATE()
    `);

  if (result.recordset.length === 0) {
    const err = new Error('Refresh token không hợp lệ hoặc đã hết hạn.');
    err.statusCode = 401;
    throw err;
  }

  const record = result.recordset[0];
  const payload = {
    id: record.UserId,
    email: record.Email,
    fullName: record.FullName,
    role: record.Role || 'User',
  };

  const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET || 'your_super_secret_key_here', {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });

  return { accessToken: newAccessToken };
};

module.exports = { register, login, logout, refreshAccessToken };
