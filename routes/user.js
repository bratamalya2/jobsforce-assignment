const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const User = require('../models/User');

const generateJWTToken = require('../utils/generateJWTToken');
const generateRefreshToken = require('../utils/generateRefreshToken');

const router = express.Router();

router.post('/signup', [
    body('email').isEmail().withMessage('Incorrect email provided!'),
    body('password').isLength({ min: 8 }).withMessage('Password should be of at least 8 characters!')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                err: errors.array()[0].msg
            })
        }

        const { email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({
                success: false,
                err: 'Email already exists!'
            });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.status(200).json({
            success: true
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            err: 'Internal server error!'
        });
    }
});

router.post('/login', [
    body('email').isEmail().withMessage('Incorrect email provided!'),
    body('password').isLength({ min: 8 }).withMessage('Password should be of at least 8 characters!')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                err: errors.array()[0].msg
            })
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, err: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, err: 'Invalid credentials' });

        const jwtToken = generateJWTToken({ id: user._id, email: user.email });
        const refreshToken = generateRefreshToken({ id: user._id, email: user.email });

        res.status(200).json({ success: true, jwtToken, refreshToken });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            err: 'Internal server error!'
        });
    }
});

module.exports = router;