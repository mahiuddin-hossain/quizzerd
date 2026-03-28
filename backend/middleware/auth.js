/**
 * backend/middleware/auth.js
 * Quizzerd — JWT Authentication Middleware
 * Protected routes এ use করো।
 * Token verify করে req.user set করে।
 */

const jwt = require('jsonwebtoken');

/**
 * JWT token verify করো
 * Authorization: Bearer <token> header থেকে token নাও
 */
function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const token = authHeader.split(' ')[1];

        // Token verify করো
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, username, email }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired. Please login again.' });
        }
        return res.status(401).json({ error: 'Invalid token.' });
    }
}

module.exports = { verifyToken };