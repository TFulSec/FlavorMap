const express = require('express');
const auth = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const controller = require('./ownerApplications.controller');

const router = express.Router();
router.use(auth);

const evidenceUpload = upload.fields([
  { name: 'storefrontImage', maxCount: 1 },
  { name: 'interiorImage', maxCount: 1 },
  { name: 'menuProof', maxCount: 1 },
  { name: 'businessProof', maxCount: 1 },
]);

router.get('/me', controller.listMine);
router.get('/:id', controller.getMine);
router.post('/', evidenceUpload, controller.create);
router.put('/:id', evidenceUpload, controller.update);
router.post('/:id/submit', controller.submit);

module.exports = router;
