const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middlewares/auth');
const albumController = require('../controllers/albumController');

router.get('/', authenticateUser, albumController.getMyAlbums);
router.get('/:id', authenticateUser, albumController.getAlbumById);
router.post('/', authenticateUser, albumController.createAlbum);
router.patch('/:id', authenticateUser, albumController.renameAlbum);
router.delete('/:id', authenticateUser, albumController.deleteAlbum);
router.post('/:albumId/images', authenticateUser, albumController.addImageToAlbum);
router.delete('/:albumId/images/:imageId', authenticateUser, albumController.removeImageFromAlbum);

module.exports = router;