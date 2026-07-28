const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import model User

// api /auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;   // role removed

        const userExists = await User.findOne({ username });
        if (userExists) return res.status(400).json({ success: false, error: 'Username already exists!' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            password: hashedPassword,
            role: 'user'   // always hardcoded, never trusts client input
        });

        await newUser.save();
        res.status(201).json({ success: true, message: 'Sign up successful' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

//  api /auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // find user by username
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ success: false, error: 'Username or password is incorrect!' });

        // compare password with hashed password in database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, error: 'Username or password is incorrect!' });

        // create jwt token to send back to frontend for authentication
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' } // expires in 1 day, can be adjusted as needed
        );

        // return token and user info (without password) to frontend
        res.json({
            success: true,
            token,
            user: { id: user._id, username: user.username, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;