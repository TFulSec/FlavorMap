const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { getPool, sql } = require('../../config/db');

const SALT_ROUNDS = 12;

const register = async ({ fullName, email, password }) => {
  const pool = await getPool();

  const existing = await pool.request()
    .input('Email', sql.NVarChar, email)
    .query('SELECT Id FROM Users WHERE Email = @Email');

  if (existing.recordset.length > 0) {
    const err = new Error('Email đã được sử dụng.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.request()
    .input('FullName',     sql.NVarChar, fullName)
    .input('Email',        sql.NVarChar, email)
    .input('PasswordHash', sql.NVarChar, passwordHash)
    .query(`
      INSERT INTO Users (FullName, Email, PasswordHash)
      OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.CreatedAt
      VALUES (@FullName, @Email, @PasswordHash)
    `);

  return result.recordset[0];
};

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

  const payload = { id: user.Id, email: user.Email, fullName: user.FullName };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES,
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES,
  });

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
    },
  };
};

const logout = async (refreshToken) => {
  const pool = await getPool();
  await pool.request()
    .input('Token', sql.NVarChar(sql.MAX), refreshToken)
    .query('DELETE FROM RefreshTokens WHERE Token = @Token');
};

const refreshAccessToken = async (refreshToken) => {
  const pool = await getPool();

  const result = await pool.request()
    .input('Token', sql.NVarChar(sql.MAX), refreshToken)
    .query(`
      SELECT rt.*, u.FullName, u.Email
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
  };

  const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES,
  });

  return { accessToken: newAccessToken };
};

module.exports = { register, login, logout, refreshAccessToken };
