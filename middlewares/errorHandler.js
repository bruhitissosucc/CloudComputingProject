const multer = require('multer');

module.exports = (err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message) {
        return res.status(400).json({ success: false, error: err.message });
    }
    next();
};
