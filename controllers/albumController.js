const AlbumModel = require('../models/Album');

async function getOrCreateLikedAlbum(userId) {
    let album = await AlbumModel.findOne({ owner: userId, isSystem: true });
    if (!album) {
        album = await AlbumModel.create({ name: 'Liked', owner: userId, isSystem: true, images: [] });
    }
    return album;
}

exports.getMyAlbums = async (req, res) => {
    try {
        await getOrCreateLikedAlbum(req.user.id);

        const albums = await AlbumModel.find({ owner: req.user.id })
            .sort({ isSystem: -1, createdAt: 1 })
            .populate('images', 'title url');

        res.json(albums);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAlbumById = async (req, res) => {
    try {
        const album = await AlbumModel.findById(req.params.id).populate('images', 'title url uploadedBy');
        if (!album) return res.status(404).json({ success: false, error: 'Album not found.' });
        if (album.owner.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'You do not have access to this album.' });
        }
        res.json(album);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createAlbum = async (req, res) => {
    try {
        const name = req.body && req.body.name ? String(req.body.name).trim() : '';
        if (!name) return res.status(400).json({ success: false, error: 'Album name cannot be empty.' });

        const album = await AlbumModel.create({ name, owner: req.user.id, isSystem: false, images: [] });
        res.status(201).json({ success: true, album });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.renameAlbum = async (req, res) => {
    try {
        const name = req.body && req.body.name ? String(req.body.name).trim() : '';
        if (!name) return res.status(400).json({ success: false, error: 'Album name cannot be empty.' });

        const album = await AlbumModel.findById(req.params.id);
        if (!album) return res.status(404).json({ success: false, error: 'Album not found.' });
        if (album.owner.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'You do not have access to this album.' });
        }

        album.name = name;
        await album.save();
        res.json({ success: true, album });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteAlbum = async (req, res) => {
    try {
        const album = await AlbumModel.findById(req.params.id);
        if (!album) return res.status(404).json({ success: false, error: 'Album not found.' });
        if (album.owner.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'You do not have access to this album.' });
        }
        if (album.isSystem) {
            return res.status(400).json({ success: false, error: 'The Liked album cannot be deleted.' });
        }

        await AlbumModel.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Album deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addImageToAlbum = async (req, res) => {
    try {
        const imageId = req.body && req.body.imageId;
        if (!imageId) return res.status(400).json({ success: false, error: 'imageId is required.' });

        const album = await AlbumModel.findById(req.params.albumId);
        if (!album) return res.status(404).json({ success: false, error: 'Album not found.' });
        if (album.owner.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'You do not have access to this album.' });
        }

        const alreadyIn = album.images.some(id => id.toString() === imageId);
        if (!alreadyIn) {
            album.images.push(imageId);
            await album.save();
        }

        res.json({ success: true, album });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.removeImageFromAlbum = async (req, res) => {
    try {
        const album = await AlbumModel.findById(req.params.albumId);
        if (!album) return res.status(404).json({ success: false, error: 'Album not found.' });
        if (album.owner.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'You do not have access to this album.' });
        }

        album.images = album.images.filter(id => id.toString() !== req.params.imageId);
        await album.save();
        res.json({ success: true, album });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const imageId = req.params.id;
        const album = await getOrCreateLikedAlbum(req.user.id);

        const alreadyLiked = album.images.some(id => id.toString() === imageId);
        if (alreadyLiked) {
            album.images = album.images.filter(id => id.toString() !== imageId);
        } else {
            album.images.push(imageId);
        }

        await album.save();
        res.json({ success: true, liked: !alreadyLiked, likedAlbumId: album._id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};