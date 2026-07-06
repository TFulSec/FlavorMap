const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    console.error('❌ Error:', err.message);
  } else {
    console.log(`ℹ️ Client Error (${statusCode}):`, err.message);
  }
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ.',
    errors: err.errors || null,
  });
};

module.exports = errorHandler;
