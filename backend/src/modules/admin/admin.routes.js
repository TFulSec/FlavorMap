const express = require('express');
const auth = require('../../middleware/auth');
const controller = require('./admin.controller');
const router = express.Router();

const authorization = (roles = ['Admin']) => {
  return (req, res, next) => {
    // DEV BYPASS
    if (process.env.NODE_ENV !== 'production' && req.headers['x-dev-bypass'] === 'true') {
        req.user = { id: 'dev-123', role: 'Admin' };
        return next();
    }
    
    if (!req.user || !roles.includes(req.user.role)) {
       return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
};

const authBypass = (req, res, next) => {
    if (process.env.NODE_ENV !== 'production' && req.headers['x-dev-bypass'] === 'true') {
        req.user = { id: 'dev-123', role: 'Admin' };
        return next();
    }
    return auth(req, res, next);
};

const upload = require('../../middleware/upload');

router.post('/upload', authBypass, authorization(['Admin', 'Manager']), upload.single('file'), controller.uploadFile);

router.get('/restaurants/:restaurantId/menu', authBypass, authorization(['Admin', 'Manager']), controller.getMenuByRestaurantId);
router.post('/restaurants/:restaurantId/menu', authBypass, authorization(['Admin', 'Manager']), controller.addMenuItem);
router.put('/menu/:id', authBypass, authorization(['Admin', 'Manager']), controller.updateMenuItem);
router.delete('/menu/:id', authBypass, authorization(['Admin', 'Manager']), controller.deleteMenuItem);

router.get('/submissions', authBypass, authorization(['Admin', 'Manager']), controller.getSubmissions);
router.put('/submissions/:id/status', authBypass, authorization(['Admin', 'Manager']), controller.updateSubmissionStatus);

router.get('/users', authBypass, authorization(['Admin', 'Manager']), controller.getUsers);
router.put('/users/:id/role', authBypass, authorization(['Admin']), controller.updateUserRole);
router.put('/users/:id/ban', authBypass, authorization(['Admin', 'Manager']), controller.banUser);

router.get('/restaurants', authBypass, authorization(['Admin', 'Manager']), controller.getRestaurants);
router.post('/restaurants', authBypass, authorization(['Admin', 'Manager']), controller.createRestaurant);
router.put('/restaurants/:id', authBypass, authorization(['Admin', 'Manager']), controller.updateRestaurant);
router.delete('/restaurants/:id', authBypass, authorization(['Admin', 'Manager']), controller.deleteRestaurant);

module.exports = router;
