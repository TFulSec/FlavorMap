const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../../config/db');

const getProfile = async (userId) => {
  const pool = await getPool();

  const result = await pool.request()
    .input('Id', sql.UniqueIdentifier, userId)
    .query(`
      SELECT
        Id,
        FullName,
        Email,
        AvatarUrl,
        Phone,
        CreatedAt
      FROM Users
      WHERE Id = @Id
    `);

  return result.recordset[0];
};

const updateProfile = async (
  userId,
  {
    fullName,
    phone,
    avatarUrl,
  }
) => {
  const pool = await getPool();

  const result = await pool.request()
    .input('Id', sql.UniqueIdentifier, userId)
    .input('FullName', sql.NVarChar, fullName)
    .input('Phone', sql.NVarChar, phone || null)
    .input('AvatarUrl', sql.NVarChar(sql.MAX), avatarUrl || null)
    .query(`
      UPDATE Users
      SET
        FullName = @FullName,
        Phone = @Phone,
        AvatarUrl = @AvatarUrl,
        UpdatedAt = GETDATE()
      WHERE Id = @Id;

      SELECT
        Id,
        FullName,
        Email,
        AvatarUrl,
        Phone
      FROM Users
      WHERE Id = @Id;
    `);

  return result.recordset[0];
};

const changePassword = async (
  userId,
  {
    currentPassword,
    newPassword,
  }
) => {
  const pool = await getPool();

  const userResult = await pool.request()
    .input('Id', sql.UniqueIdentifier, userId)
    .query(`
      SELECT PasswordHash
      FROM Users
      WHERE Id = @Id
    `);

  const user = userResult.recordset[0];

  if (!user) {
    const err = new Error('Người dùng không tồn tại.');
    err.statusCode = 404;
    throw err;
  }

  const isMatch = await bcrypt.compare(
    currentPassword,
    user.PasswordHash
  );

  if (!isMatch) {
    const err = new Error('Mật khẩu hiện tại không đúng.');
    err.statusCode = 400;
    throw err;
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  await pool.request()
    .input('Id', sql.UniqueIdentifier, userId)
    .input('Hash', sql.NVarChar, newHash)
    .query(`
      UPDATE Users
      SET
        PasswordHash = @Hash,
        UpdatedAt = GETDATE()
      WHERE Id = @Id;

      DELETE FROM RefreshTokens
      WHERE UserId = @Id;
    `);
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};