require('dotenv').config();
const jwt = require('jsonwebtoken');

function generateJWTToken(user) {
    const secretKey = process.env.JWT_SECRET;
    return jwt.sign(user, secretKey, { expiresIn: '30m' });
}

module.exports = generateJWTToken;