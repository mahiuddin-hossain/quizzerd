/**
 * backend/routes/leaderboard.js
 * Quizzerd — Leaderboard API (Optimized)
 */

const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/leaderboard
router.get('/', verifyToken, async (req, res) => {
    try {
        // 🔥 Optimized Query: No JOIN, SUM(), or GROUP BY needed!
        const [rows] = await db.execute(`
            SELECT 
                id AS user_id, 
                first_name, 
                last_name, 
                username,
                total_point,
                total_attempt_quizz
            FROM users
            WHERE total_point > 0
            ORDER BY total_point DESC, total_attempt_quizz ASC
            LIMIT 50
        `);

        res.json({ leaderboard: rows });
    } catch (error) {
        console.error('Leaderboard fetch error:', error);
        res.status(500).json({ error: 'লিডারবোর্ড লোড করতে সমস্যা হয়েছে।' });
    }
});

module.exports = router;