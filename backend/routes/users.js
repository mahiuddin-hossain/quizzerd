/**
 * backend/routes/users.js
 * Quizzerd — User Routes (Updated with direct total_questions access)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// =============================================
// GET /api/users/:id/stats
// User এর dashboard stats নিয়ে আসো (Optimized)
// =============================================
router.get('/:id/stats', verifyToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Unauthorized access.' });
        }

        // ✅ আপডেট: attempts টেবিল থেকে সরাসরি SUM এবং COUNT করা হচ্ছে
        const [rows] = await db.execute(
            `SELECT 
                COALESCE(SUM(score), 0) AS total_score,
                COUNT(*) AS quizzes_played,
                COALESCE(SUM(total_questions), 0) AS total_questions_sum
             FROM attempts WHERE user_id = ?`,
            [userId]
        );

        const { total_score, quizzes_played, total_questions_sum } = rows[0];

        // Accuracy হিসাব (প্রতিটি প্রশ্নের মান ১০ ধরে)
        // যেহেতু score এবং total_questions (মোট প্রশ্নের সংখ্যা) আমাদের কাছে আছে:
        const totalPossibleScore = total_questions_sum * 10;
        const accuracy = totalPossibleScore > 0
            ? Math.round((total_score / totalPossibleScore) * 100)
            : 0;

        res.json({
            total_score: parseInt(total_score),
            quizzes_played: quizzes_played,
            accuracy: accuracy
        });

    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({ error: 'পরিসংখ্যান লোড করতে সমস্যা হয়েছে।' });
    }
});

// =============================================
// GET /api/users/:id/quizzes
// User এর সাম্প্রতিক quiz attempts নিয়ে আসো
// =============================================
router.get('/:id/quizzes', verifyToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Unauthorized access.' });
        }

        // ✅ আপডেট: সাব-কুয়েরির বদলে সরাসরি a.total_questions ব্যবহার করা হয়েছে
        const [quizzes] = await db.execute(
            `SELECT 
                a.id AS attempt_id,
                a.score,
                a.total_questions,
                a.attempted_at,
                q.id AS quiz_id,
                q.subject,
                q.difficulty 
             FROM attempts a 
             JOIN quizzes q ON a.quiz_id = q.id 
             WHERE a.user_id = ? 
             ORDER BY a.attempted_at DESC 
             LIMIT 10`,
            [userId]
        );

        res.json({ quizzes });

    } catch (error) {
        console.error('User quizzes fetch error:', error);
        res.status(500).json({ error: 'কুইজ তালিকা লোড করতে সমস্যা হয়েছে।' });
    }
});

// =============================================
// PUT /api/users/:id
// User profile update করো (অপরিবর্তিত)
// =============================================
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Unauthorized access.' });
        }

        const { first_name, last_name, email, current_password, new_password } = req.body;

        if (!first_name || !last_name || !email) {
            return res.status(400).json({ error: 'নাম ও ইমেইল আবশ্যক।' });
        }

        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ error: 'ব্যবহারকারী পাওয়া যায়নি।' });
        const user = users[0];

        const [emailCheck] = await db.execute(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, userId]
        );
        if (emailCheck.length > 0) return res.status(409).json({ error: 'এই ইমেইল ইতিমধ্যে ব্যবহৃত হচ্ছে।' });

        if (new_password) {
            if (!current_password) return res.status(400).json({ error: 'বর্তমান পাসওয়ার্ড দিন।' });
            const isMatch = await bcrypt.compare(current_password, user.password);
            if (!isMatch) return res.status(401).json({ error: 'বর্তমান পাসওয়ার্ড ভুল।' });
            if (new_password.length < 6) return res.status(400).json({ error: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(new_password, salt);

            await db.execute(
                'UPDATE users SET first_name = ?, last_name = ?, email = ?, password = ? WHERE id = ?',
                [first_name, last_name, email, hashedPassword, userId]
            );
        } else {
            await db.execute(
                'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
                [first_name, last_name, email, userId]
            );
        }

        res.json({
            message: 'প্রোফাইল আপডেট সফল হয়েছে।',
            user: { id: userId, first_name, last_name, email }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে।' });
    }
});

module.exports = router;