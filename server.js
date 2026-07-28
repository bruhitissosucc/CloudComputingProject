require('dotenv').config();
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose'); 
const path = require('path');

const { authenticateUser, authorizeRoles } = require('./middlewares/auth');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('Error connecting to MongoDB Atlas:', err));

// Define the Image model (models/Image.js)
const ImageModel = require('./models/Image');

// 2. Backend API for image upload and management
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

const authRoutes = require('./routes/auth');
const imagesRouter = require('./routes/images');

app.use(express.static('public'));
app.use('/api/auth', authRoutes);

// Mount refactored image routes (keeps existing API surface)
app.use('/api', imagesRouter);

// API 4: Admin dashboard route (protected)
app.get('/api/admin/dashboard', authenticateUser, authorizeRoles('admin'), (req, res) => {
    res.json({ message: "Welcome to the admin dashboard" });
});

// Centralized error handler (/middleware/errorHandler.js)
app.use(require('./middlewares/errorHandler'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`System running on port ${PORT}`));