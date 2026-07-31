const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isSystem: { type: Boolean, default: false },
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Image' }]
}, { timestamps: true });

module.exports = mongoose.model('Album', albumSchema);