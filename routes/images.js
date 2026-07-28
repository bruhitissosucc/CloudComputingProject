const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { authenticateUser } = require('../middlewares/auth');
const imageController = require('../controllers/imageController');

// Preserve original API surface: POST /api/upload, GET /api/images, DELETE /api/images/:id
router.post('/upload', authenticateUser, upload.single('image'), imageController.uploadImage);
router.get('/images', imageController.listImages);
router.get('/me/images', authenticateUser, imageController.listUserImages);
router.patch('/images/:id', authenticateUser, imageController.updateImage);
router.delete('/images/:id', authenticateUser, imageController.deleteImage);

module.exports = router;
