/**
 * backend/routes/attempts.js
 * POST /api/attempts        → quiz attempt save করো (এবং attempt_count আপডেট করো)
 * GET  /api/attempts/:id    → attempt review data আনো
 */

const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// =============================================
// POST /api/attempts
// Quiz শেষে attempt save করো, Quiz count বাড়াও এবং User এর total_point আপডেট করো
// =============================================
router.post('/', verifyToken, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const userId = req.user.id;
        const { quiz_id, answers } = req.body;

        if (!quiz_id || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'quiz_id এবং answers আবশ্যক।' });
        }

        const score = answers.filter(a => a.is_correct).length * 10;  // ১0 পয়েন্ট per correct
        const totalQuestions = answers.length;

        await connection.beginTransaction();

        // ১. Attempts টেবিলে ডাটা সেভ করা
        const [attemptResult] = await connection.execute(
            `INSERT INTO attempts (user_id, quiz_id, score, total_questions, attempted_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [userId, quiz_id, score, totalQuestions]
        );
        const attemptId = attemptResult.insertId;

        // ২. Quizzes টেবিলে attempt_count ১ বাড়িয়ে দেওয়া
        await connection.execute(
            `UPDATE quizzes SET attempt_count = attempt_count + 1 WHERE id = ?`,
            [quiz_id]
        );

        // ৩. 🔥 Users টেবিলে ইউজারের total_attempt_quizz এবং total_point আপডেট করা
        await connection.execute(
            `UPDATE users 
             SET total_attempt_quizz = total_attempt_quizz + 1, 
                 total_point = total_point + ? 
             WHERE id = ?`,
            [score, userId]
        );

        // ৪. Attempt Answers টেবিলে ইউজারের উত্তর সেভ করা
        for (const ans of answers) {
            await connection.execute(
                `INSERT INTO attempt_answers (attempt_id, question_id, selected_option, is_correct)
                 VALUES (?, ?, ?, ?)`,
                [attemptId, ans.question_id, ans.selected_option || null, ans.is_correct ? 1 : 0]
            );
        }

        await connection.commit();

        res.status(201).json({
            message: 'Attempt saved successfully.',
            attempt_id: attemptId,
            score,
            total_questions: totalQuestions
        });

    } catch (error) {
        await connection.rollback();
        console.error('Attempt save error:', error);
        res.status(500).json({ error: 'Attempt সেভ করতে সমস্যা হয়েছে।' });
    } finally {
        connection.release();
    }
});

// =============================================
// GET /api/attempts/:id
// Attempt review — সব প্রশ্ন, অপশন, সঠিক/ভুল এবং creator_id সহ
// =============================================
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const attemptId = parseInt(req.params.id);
        const userId = req.user.id;

        // 🔥 এখানে q.user_id AS creator_id যোগ করা হয়েছে
        const [attemptRows] = await db.execute(
            `SELECT a.*, q.subject, q.difficulty, q.user_id AS creator_id
             FROM attempts a
             JOIN quizzes q ON a.quiz_id = q.id
             WHERE a.id = ? AND a.user_id = ?`,
            [attemptId, userId]
        );

        if (attemptRows.length === 0) {
            return res.status(404).json({ error: 'Attempt পাওয়া যায়নি।' });
        }

        const attempt = attemptRows[0];

        // সব প্রশ্ন + options + user এর answer আনো
        const [questions] = await db.execute(
            `SELECT 
                qn.id AS question_id,
                qn.question_text,
                qn.correct_answer,
                aa.selected_option,
                aa.is_correct
             FROM questions qn
             LEFT JOIN attempt_answers aa 
                ON aa.question_id = qn.id AND aa.attempt_id = ?
             WHERE qn.quiz_id = ?
             ORDER BY qn.id ASC`,
            [attemptId, attempt.quiz_id]
        );

        for (const q of questions) {
            const [options] = await db.execute(
                `SELECT id, option_text FROM options WHERE question_id = ? ORDER BY id ASC`,
                [q.question_id]
            );
            q.options = options;
        }

        res.json({
            attempt: {
                id: attempt.id,
                quiz_id: attempt.quiz_id,
                creator_id: attempt.creator_id, // 🔥 ফ্রন্টএন্ডে creator_id পাঠানো হচ্ছে
                subject: attempt.subject,
                difficulty: attempt.difficulty,
                score: attempt.score,
                total_questions: attempt.total_questions,
                attempted_at: attempt.attempted_at
            },
            questions
        });

    } catch (error) {
        console.error('Attempt review error:', error);
        res.status(500).json({ error: 'Review লোড করতে সমস্যা হয়েছে।' });
    }
});

module.exports = router;