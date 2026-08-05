const Joi = require('joi');
const service = require('./voteRooms.service');

const createRoomSchema = Joi.object({
  restaurantIds: Joi.array()
    .items(Joi.string().trim().min(1).max(100))
    .min(2)
    .max(20)
    .unique()
    .required(),
});

const voteSchema = Joi.object({
  restaurantId: Joi.string().trim().min(1).max(100).required(),
});

const statusSchema = Joi.object({
  status: Joi.string().valid('open', 'closed').required(),
});

const roomCodeSchema = Joi.string().length(6).pattern(/^[A-HJ-NP-Z2-9]{6}$/).required();

const validate = (schema, value) => {
  const { error, value: validated } = schema.validate(value, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const validationError = new Error(error.details.map((item) => item.message).join('; '));
    validationError.statusCode = 400;
    throw validationError;
  }
  return validated;
};

exports.createRoom = async (req, res, next) => {
  try {
    const body = validate(createRoomSchema, req.body);
    const room = await service.createRoom({
      creatorUserId: req.user.id,
      restaurantIds: body.restaurantIds,
    });
    return res.status(201).json({ success: true, data: room });
  } catch (error) {
    return next(error);
  }
};

exports.getRoom = async (req, res, next) => {
  try {
    const code = validate(roomCodeSchema, String(req.params.code || '').toUpperCase());
    const room = await service.getRoomByCode(
      code,
      req.user ? `user:${req.user.id}` : null
    );
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, data: room });
  } catch (error) {
    return next(error);
  }
};

exports.vote = async (req, res, next) => {
  try {
    const code = validate(roomCodeSchema, String(req.params.code || '').toUpperCase());
    const body = validate(voteSchema, req.body);
    const result = await service.vote({
      code,
      restaurantId: body.restaurantId,
      userIdentifier: `user:${req.user.id}`,
    });
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const code = validate(roomCodeSchema, String(req.params.code || '').toUpperCase());
    const body = validate(statusSchema, req.body);
    const result = await service.updateRoomStatus({
      code,
      requesterUserId: req.user.id,
      requesterRole: req.user.role,
      status: body.status,
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};
