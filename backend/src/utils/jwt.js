const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET bắt buộc phải được cấu hình trong production.');
  }
  return 'flavormap-local-development-secret-change-me';
};

module.exports = { getJwtSecret };
