const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message || err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ.',
    errors: err.errors || null,
  });
};

module.exports = errorHandler;
