const path = require('path');
const ImageModel = require('../models/Image');
const { uploadToS3, deleteFromS3 } = require('../services/s3');

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'Không có tệp tin nào được chọn.' });

        const cleanOriginalName = req.file.originalname.replace(/[&<>'"]/g, "");
        const requestedTitle = req.body && req.body.title ? String(req.body.title).trim() : '';
        const finalTitle = requestedTitle || cleanOriginalName;
        const fileName = `${Date.now()}-${path.basename(cleanOriginalName)}`;

        const cloudFrontUrl = await uploadToS3(req.file.buffer, fileName, req.file.mimetype);

        const newImage = new ImageModel({
            title: finalTitle,
            url: cloudFrontUrl,
            uploadedBy: req.user.id
        });
        await newImage.save();

        res.json({
            success: true,
            url: cloudFrontUrl,
            title: newImage.title,
            id: newImage._id,
            uploadedBy: newImage.uploadedBy
        });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.listImages = async (req, res) => {
    try {
        const images = await ImageModel.find()
            .sort({ createdAt: -1 })
            .populate('uploadedBy', 'username');
        res.json(images);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listUserImages = async (req, res) => {
    try {
        const images = await ImageModel.find({ uploadedBy: req.user.id })
            .sort({ createdAt: -1 })
            .populate('uploadedBy', 'username');
        res.json(images);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateImage = async (req, res) => {
    try {
        const image = await ImageModel.findById(req.params.id);
        if (!image) {
            return res.status(404).json({ success: false, error: 'Image not found.' });
        }

        if (req.user.role !== 'admin' && (!image.uploadedBy || image.uploadedBy.toString() !== req.user.id)) {
            return res.status(403).json({
                success: false,
                error: 'Error: you are not authorized to edit this image. Only the uploader or an admin can perform this action.'
            });
        }

        const newTitle = req.body && req.body.title ? String(req.body.title).trim() : '';
        if (!newTitle) {
            return res.status(400).json({ success: false, error: 'Image title cannot be empty.' });
        }

        image.title = newTitle;
        await image.save();

        res.json({ success: true, image });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteImage = async (req, res) => {
    try {
        const image = await ImageModel.findById(req.params.id);
        if (!image) {
            return res.status(404).json({ success: false, error: 'Image not found.' });
        }

        if (req.user.role !== 'admin' && (!image.uploadedBy || image.uploadedBy.toString() !== req.user.id)) {
            return res.status(403).json({
                success: false,
                error: 'Error: you are not authorized to delete this image. Only the uploader or an admin can perform this action.'
            });
        }

        // The DB only stores the full CloudFront URL, so recover the raw S3 key from it
        const key = image.url.replace(`${process.env.CLOUDFRONT_URL}/`, '');

        try {
            await deleteFromS3(key);
        } catch (s3Error) {
            console.error('S3 deletion error:', s3Error);
            // Not re-throwing here — see note below on why
        }

        await ImageModel.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Image deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
