/**
 * backend/routes/explore.js
 * Explore page APIs (Optimized with Counter Caching / Denormalization)
 */

const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// =============================================
// GET /api/explore/trending
// সবচেয়ে বেশিবার খেলা হওয়া টপ ৩টি কুইজ আনবে
// =============================================
router.get('/trending', verifyToken, async (req, res) => {
    try {
        // 🔥 Optimized Query: No JOIN with attempts table needed anymore!
        const query = `
            SELECT q.id, q.subject, q.difficulty, q.created_at, q.attempt_count, u.username, 
                   (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as total_questions
            FROM quizzes q
            JOIN users u ON q.user_id = u.id
            HAVING total_questions > 0
            ORDER BY q.attempt_count DESC, q.created_at DESC
            LIMIT 3
        `;
        const [rows] = await db.execute(query);
        res.json(rows);
    } catch (error) {
        console.error('Trending fetch error:', error);
        res.status(500).json({ error: 'ট্রেন্ডিং কুইজ লোড করতে সমস্যা হয়েছে।' });
    }
});

// =============================================
// GET /api/explore/quizzes
// সার্চ এবং ফিল্টার সহ সব কুইজ আনবে
// =============================================
router.get('/quizzes', verifyToken, async (req, res) => {
    try {
        const search = req.query.search || '';
        const difficulty = req.query.difficulty || 'all';

        // 🔥 Optimized Query
        let query = `
            SELECT q.id, q.subject, q.difficulty, q.created_at, q.attempt_count, u.username, 
                   (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as total_questions
            FROM quizzes q
            JOIN users u ON q.user_id = u.id
            WHERE q.subject LIKE ?
        `;
        const queryParams = [`%${search}%`];

        if (difficulty !== 'all') {
            query += ` AND q.difficulty = ?`;
            queryParams.push(difficulty);
        }

        query += `
            HAVING total_questions > 0
            ORDER BY q.created_at DESC
            LIMIT 20
        `;

        const [rows] = await db.execute(query, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('Explore fetch error:', error);
        res.status(500).json({ error: 'কুইজ লোড করতে সমস্যা হয়েছে।' });
    }
});

module.exports = router;