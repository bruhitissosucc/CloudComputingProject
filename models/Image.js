const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Image', ImageSchema);