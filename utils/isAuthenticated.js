const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateJWTToken = require('./generateJWTToken');

function isAuthenticated(req, res, next) {
    const secretKey = process.env.JWT_SECRET;

    if (!req.headers.jwttoken || !req.headers.refreshtoken)
        return res.status(401).json({
            success: false,
            err: 'No token provided!'
        });
    else {
        jwt.verify(req.headers.jwttoken, secretKey, (err, decoded) => {
            if (err) {
                if (err.message === 'jwt expired') {
                    jwt.verify(req.headers.refreshtoken, secretKey, (err2, decoded2) => {
                        if (err2)
                            return res.status(401).json({
                                success: false,
                                err: err
                            });
                        else {
                            const user = {
                                id: decoded2.id,
                                email: decoded2.email
                            };
                            const x = generateJWTToken(user);
                            return res.status(200).json({
                                success: false,
                                err: 'Refresh JWT Token!',
                                jwt: x
                            });
                        }
                    });
                }
                else
                    return res.status(401).json({
                        success: false,
                        err: err
                    });
            }
            else {
                const user = {
                    id: decoded.id,
                    email: decoded.email
                };
                res.locals.user = user;
                next();
            }
        });
    }
}

module.exports = isAuthenticated;