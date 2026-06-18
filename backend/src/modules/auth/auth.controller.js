const Joi     = require('joi');
const service = require('./auth.service');

const registerSchema = Joi.object({
  fullName:        Joi.string().min(2).max(100).required().messages({
    'string.min':  'Họ tên phải có ít nhất 2 ký tự.',
    'any.required': 'Họ tên là bắt buộc.',
  }),
  email:           Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ.',
    'any.required': 'Email là bắt buộc.',
  }),
  password:        Joi.string().min(8).required().messages({
    'string.min':  'Mật khẩu phải có ít nhất 8 ký tự.',
    'any.required': 'Mật khẩu là bắt buộc.',
  }),
  confirmPassword: Joi.valid(Joi.ref('password')).required().messages({
    'any.only': 'Xác nhận mật khẩu không khớp.',
  }),
});

exports.register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ.',
        errors: error.details.map(d => d.message),
      });
    }
    const user = await service.register(value);
    res.status(201).json({ success: true, message: 'Đăng ký thành công!', data: user });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu.' });
    }
    const data = await service.login({ email, password });
    res.json({ success: true, message: 'Đăng nhập thành công!', data });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await service.logout(refreshToken);
    res.json({ success: true, message: 'Đăng xuất thành công.' });
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Thiếu refresh token.' });
    }
    const data = await service.refreshAccessToken(refreshToken);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
