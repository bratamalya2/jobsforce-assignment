require('dotenv').config();

const jwt = require('jsonwebtoken');

function generateRefreshToken(user) {
    const secretKey = process.env.JWT_SECRET;
    return jwt.sign(user, secretKey, { expiresIn: '30d' });
}

module.exports = generateRefreshToken;