const parseIsoDateOnly = (value, fieldName) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
    const error = new Error(`${fieldName} phải có định dạng YYYY-MM-DD.`);
    error.statusCode = 400;
    throw error;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    const error = new Error(`${fieldName} không phải ngày hợp lệ.`);
    error.statusCode = 400;
    throw error;
  }
  return date;
};

module.exports = { parseIsoDateOnly };
