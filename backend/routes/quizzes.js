/**
 * backend/routes/quizzes.js
 * Quizzerd — Quiz Routes (Optimized with Groq API)
 * FIXED: 
 * 1. Updated Model to 'llama-3.3-70b-versatile'
 * 2. Fixed 'Column prompt cannot be null' error by sending empty string instead of null
 */

const express = require('express');
const Groq = require('groq-sdk');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Groq client initialize
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// =============================================
// POST /api/quizzes/generate
// =============================================
router.post('/generate', verifyToken, async (req, res) => {
    let connection;
    try {
        const { subject, prompt, difficulty, question_count } = req.body;
        const userId = req.user.id;

        if (!subject || !difficulty) {
            return res.status(400).json({ error: 'Subject and difficulty are required.' });
        }

        const n = Math.min(parseInt(question_count) || 5, 10);
        const topicFocus = prompt?.trim() ? `Specific focus: ${prompt.trim()}.` : '';

        // ==========================================
        // 🔥 FULLY OPTIMIZED PROMPT FOR GROQ
        // ==========================================
        const systemPrompt = `You are an expert university professor creating a highly accurate multiple-choice exam.
Your rules:
1. Questions MUST be 100% factually accurate.
2. The 3 wrong options (distractors) must be highly plausible and realistic, but definitively incorrect. Do NOT use silly, obvious, or ambiguous options.
3. Never use "All of the above" or "None of the above".
4. You MUST return ONLY a JSON object containing a "questions" array. No markdown, no introductory text.

Example JSON format:
{
  "questions": [
    {
      "question": "Which of the following best describes a 'Closure' in JavaScript?",
      "options": [
        "A function bundled together with references to its surrounding state.",
        "A method used to securely close a database connection.",
        "A synchronous block of code that prevents asynchronous execution.",
        "A strictly typed variable declaration restricted to block scope."
      ],
      "correct": "A function bundled together with references to its surrounding state."
    }
  ]
}`;

        const userPrompt = `Create ${n} multiple-choice questions about ${subject}. ${topicFocus} Difficulty level: ${difficulty}.`;

        // ---- Groq API Call ----
        // Model: llama-3.3-70b-versatile
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            response_format: { type: "json_object" }
        });

        // Parse JSON response
        let responseContent = chatCompletion.choices[0]?.message?.content;

        // Safety: Clean any markdown code blocks
        if (responseContent) {
            responseContent = responseContent.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        let parsedData;
        try {
            parsedData = JSON.parse(responseContent);
        } catch (e) {
            console.error("JSON Parse Error:", responseContent);
            throw new Error("AI generated invalid JSON format.");
        }

        const questions = parsedData.questions || [];

        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('AI returned an empty or invalid format.');
        }

        // ---- Database Transaction ----
        connection = await db.getConnection();
        await connection.beginTransaction();

        // FIX: prompt || null এর পরিবর্তে prompt || '' ব্যবহার করা হয়েছে
        const [quizResult] = await connection.execute(
            `INSERT INTO quizzes (user_id, subject, prompt, difficulty, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [userId, subject, prompt || '', difficulty]
        );
        const quizId = quizResult.insertId;

        for (const q of questions) {
            const [questionResult] = await connection.execute(
                `INSERT INTO questions (quiz_id, question_text, correct_answer)
                 VALUES (?, ?, ?)`,
                [quizId, q.question, q.correct]
            );
            const questionId = questionResult.insertId;

            for (const optionText of q.options) {
                await connection.execute(
                    `INSERT INTO options (question_id, option_text)
                     VALUES (?, ?)`,
                    [questionId, optionText]
                );
            }
        }

        await connection.commit();

        res.status(201).json({
            message: 'Quiz generated successfully!',
            quiz_id: quizId,
            subject,
            total_questions: questions.length
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Quiz generate error:', error);
        res.status(500).json({ error: 'Failed to generate quiz. Please try again.' });
    } finally {
        if (connection) connection.release();
    }
});

// =============================================
// GET /api/quizzes/:id
// =============================================
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const quizId = parseInt(req.params.id);
        const [rows] = await db.execute(
            `SELECT q.id AS quiz_id, q.subject, q.difficulty, q.created_at,
                    qn.id AS question_id, qn.question_text, qn.correct_answer,
                    o.id AS option_id, o.option_text
             FROM quizzes q
             LEFT JOIN questions qn ON q.id = qn.quiz_id
             LEFT JOIN options o ON qn.id = o.question_id
             WHERE q.id = ?
             ORDER BY qn.id ASC, o.id ASC`,
            [quizId]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Quiz not found.' });

        const quizData = {
            id: rows[0].quiz_id,
            subject: rows[0].subject,
            difficulty: rows[0].difficulty,
            created_at: rows[0].created_at,
            questions: []
        };

        const questionMap = new Map();
        rows.forEach(row => {
            if (row.question_id && !questionMap.has(row.question_id)) {
                const qObj = {
                    id: row.question_id,
                    question_text: row.question_text,
                    correct_answer: row.correct_answer,
                    options: []
                };
                questionMap.set(row.question_id, qObj);
                quizData.questions.push(qObj);
            }
            if (row.option_id && row.question_id) {
                questionMap.get(row.question_id).options.push({
                    id: row.option_id,
                    option_text: row.option_text
                });
            }
        });

        res.json(quizData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error while fetching quiz.' });
    }
});

// =============================================
// DELETE /api/quizzes/:id
// =============================================
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const quizId = parseInt(req.params.id);
        const userId = req.user.id;
        const [quizRows] = await db.execute('SELECT user_id FROM quizzes WHERE id = ?', [quizId]);

        if (quizRows.length === 0) return res.status(404).json({ error: 'Quiz not found.' });
        if (quizRows[0].user_id !== userId) return res.status(403).json({ error: 'Unauthorized.' });

        await db.execute('DELETE FROM quizzes WHERE id = ?', [quizId]);
        res.json({ message: 'Quiz deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error while deleting quiz.' });
    }
});


// =============================================
// PUT /api/quizzes/:id
// Update Quiz Subject and Difficulty (CRUD - Update)
// =============================================
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const quizId = parseInt(req.params.id);
        const userId = req.user.id;
        const { subject, difficulty } = req.body;

        if (!subject || !difficulty) {
            return res.status(400).json({ error: 'Subject এবং Difficulty দেওয়া আবশ্যক।' });
        }

        // ডাটাবেসে UPDATE কুয়েরি চালানো
        const [result] = await db.execute(
            'UPDATE quizzes SET subject = ?, difficulty = ? WHERE id = ? AND user_id = ?',
            [subject, difficulty, quizId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'কুইজ পাওয়া যায়নি অথবা আপডেট করার অনুমতি নেই।' });
        }

        res.json({ message: 'কুইজ সফলভাবে আপডেট হয়েছে!' });
    } catch (error) {
        console.error('Update Quiz Error:', error);
        res.status(500).json({ error: 'সার্ভারে আপডেট করতে সমস্যা হয়েছে।' });
    }
});



module.exports = router;