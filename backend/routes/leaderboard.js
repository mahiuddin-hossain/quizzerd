/**
 * backend/routes/leaderboard.js
 * Quizzerd — Leaderboard API
 */

const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/leaderboard
router.get('/', verifyToken, async (req, res) => {
    try {
        // সব ইউজারের মোট স্কোর এবং মোট কুইজ খেলার সংখ্যা বের করা হচ্ছে
        const [rows] = await db.execute(`
            SELECT 
                u.id AS user_id, 
                u.first_name, 
                u.last_name, 
                u.username,
                COALESCE(SUM(a.score), 0) AS total_score,
                COUNT(a.id) AS quizzes_played
            FROM users u
            LEFT JOIN attempts a ON u.id = a.user_id
            GROUP BY u.id
            HAVING total_score > 0
            ORDER BY total_score DESC, quizzes_played ASC
            LIMIT 50
        `);

        res.json({ leaderboard: rows });
    } catch (error) {
        console.error('Leaderboard fetch error:', error);
        res.status(500).json({ error: 'লিডারবোর্ড লোড করতে সমস্যা হয়েছে।' });
    }
});

module.exports = router;