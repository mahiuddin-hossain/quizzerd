const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// 1. POST /api/bookmarks -> বুকমার্ক সেভ করা
router.post('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { question_text, options, correct_answer } = req.body;

        if (!question_text || !options || !correct_answer) {
            return res.status(400).json({ error: 'Data is missing.' });
        }

        const optionsString = JSON.stringify(options);

        // চেক করা যে এই প্রশ্নটি আগে বুকমার্ক করা আছে কিনা
        const [existing] = await db.execute(
            'SELECT id FROM bookmarks WHERE user_id = ? AND question_text = ?',
            [userId, question_text]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'এই প্রশ্নটি আগেই বুকমার্ক করা হয়েছে!' });
        }

        await db.execute(
            'INSERT INTO bookmarks (user_id, question_text, options, correct_answer) VALUES (?, ?, ?, ?)',
            [userId, question_text, optionsString, correct_answer]
        );

        res.json({ message: 'বুকমার্ক সেভ হয়েছে!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'বুকমার্ক সেভ করতে সমস্যা হয়েছে।' });
    }
});

// 2. GET /api/bookmarks -> ইউজারের সব বুকমার্ক আনা
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.execute(
            'SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        // Options string কে আবার Array (JSON) এ কনভার্ট করে দেওয়া
        const bookmarks = rows.map(row => ({
            ...row,
            options: JSON.parse(row.options)
        }));

        res.json(bookmarks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'বুকমার্ক লোড করতে সমস্যা হয়েছে।' });
    }
});

// 3. DELETE /api/bookmarks/:id -> বুকমার্ক ডিলিট করা
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const bookmarkId = req.params.id;
        const userId = req.user.id;
        await db.execute('DELETE FROM bookmarks WHERE id = ? AND user_id = ?', [bookmarkId, userId]);
        res.json({ message: 'বুকমার্ক ডিলিট করা হয়েছে।' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ডিলিট করতে সমস্যা হয়েছে।' });
    }
});

module.exports = router;